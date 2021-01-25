import log from 'loglevel';
import { v4 as uuid } from 'uuid';
import { HttpHeaders, LinkRelations, ShapeTreeResourceType } from "@core/enums";
import { ShapeTreeException } from "@core/exceptions";
import { ShapeTree } from "@core/models/ShapeTree";
import { ShapeTreeContext } from "@core/models/ShapeTreeContext";
import { ShapeTreeLocator } from "@core/models/ShapeTreeLocator";
import { ShapeTreePlantResult } from "@core/models/ShapeTreePlantResult";
import { ValidationContext } from "@core/models/ValidationContext";
import { ResourceAccessor } from "@core/ResourceAccessor";
import { ShapeTreeFactory } from "@core/ShapeTreeFactory";
import { ShapeTreeRequest } from "@core/ShapeTreeRequest";
import { ShapeTreeResource } from "@core/ShapeTreeResource";
import { ShapeTreeValidationResponse } from "@core/ShapeTreeValidationResponse";
import { Store } from "n3";
import { URL } from "url";
import { AbstractValidatingMethodHandler } from "./AbstractValidatingMethodHandler";
import { ValidatingMethodHandler } from "./ValidatingMethodHandler";
import { ValidationResult } from '@core/models/ValidationResult';
import { ShapeTreeVocabulary } from '@core/vocabularies/ShapeTreeVocabulary';

// @Slf4j
export class ValidatingPostMethodHandler extends AbstractValidatingMethodHandler implements ValidatingMethodHandler {

  public constructor(resourceAccessor: ResourceAccessor) {
    super(resourceAccessor);
  }

  // @Override
  public async validateRequest(shapeTreeRequest: ShapeTreeRequest<any>): Promise<ShapeTreeValidationResponse> {
    try {
      const shapeTreeContext: ShapeTreeContext = this.buildContextFromRequest(shapeTreeRequest);
      const existingResource: ShapeTreeResource = this.getRequestResource(shapeTreeContext, shapeTreeRequest);
      shapeTreeRequest.setResourceType(this.determineResourceType(shapeTreeRequest, existingResource));

      this.ensureRequestResourceExists(existingResource, "Parent Container not found");

      let requestedName: string = this.getIncomingHeaderValueWithDefault(shapeTreeRequest, HttpHeaders.SLUG, UUID.randomUUID().toString());
      const incomingRequestShapeTreeUris: string[] = this.getIncomingLinkHeaderByRelationValue(shapeTreeRequest, LinkRelations.SHAPETREE);
      const normalizedBaseURI: URL = this.normalizeBaseURI(existingResource.getUri(), requestedName, shapeTreeRequest.getResourceType());
      const incomingRequestBodyGraph: Store = this.getIncomingBodyGraph(shapeTreeRequest, normalizedBaseURI) ||
        (() => { throw new ShapeTreeException(422, "Failed to load graph for " + normalizedBaseURI) })();

      if (incomingRequestShapeTreeUris !== null && incomingRequestShapeTreeUris.length !== 0) {
        // This means we're Planting a new Shape Tree

        // If we are performing a plant there are few levels of validation we need to perform:
        // 1.  Ensure that between existing and new ShapeTrees the configuration is not invalid
        // 2.  The body of the incoming request against the ShapeTree, if it has a shapeURI present
        // 3.  The ShapeTree of the parent container looking at the appropriate contents node

        // Determine the ShapeTrees that are being requested to be planted
        const shapeTreesToPlant: ShapeTree[] = new Array();
        let shapeTree: ShapeTree;

        for (const shapeTreeUri of incomingRequestShapeTreeUris) {
          shapeTree = await ShapeTreeFactory.getShapeTree(new URL(shapeTreeUri)) ||
            (() => { throw new ShapeTreeException(422, "Failed to load shape tree " + shapeTreeUri) })();
          shapeTreesToPlant.push(shapeTree);
        }

        // 1.  Validate the potentially multiple ShapeTrees to ensure they don't conflict
        //     this will also retrieve any already planted ShapeTrees and ensure both existing and are valid
        this.validateShapeTrees(shapeTreeContext, existingResource.getUri(), requestedName, shapeTreesToPlant);


        // 2. Validate the request body using the appropriate ShapeTree
        this.validateRequestBody(shapeTreeRequest, incomingRequestBodyGraph, normalizedBaseURI, shapeTreesToPlant);

        // 3. Validate the request against the parent container which may already be a managed container
        this.validateAgainstParentContainer(shapeTreeContext, incomingRequestBodyGraph, normalizedBaseURI, existingResource, requestedName, shapeTreeRequest);

        // At this point all validations have been passed and the ShapeTree can be planted
        const plantResults: ShapeTreePlantResult[] = new Array();
        for (const shapeTreeToPlant of shapeTreesToPlant) {
          const plantResult: ShapeTreePlantResult = await this.plantShapeTreeStore(shapeTreeContext, existingResource, incomingRequestBodyGraph, shapeTreeToPlant, null, shapeTreeToPlant, requestedName);
          plantResults.push(plantResult);
        }
        // Create and return a response
        return ValidatingPostMethodHandler.createPlantResponse(plantResults, shapeTreeRequest);
      } else {
        const validationContext: ValidationContext = await this.validateAgainstParentContainer(shapeTreeContext, incomingRequestBodyGraph, normalizedBaseURI, existingResource, requestedName, shapeTreeRequest) ||
          (() => { throw new ShapeTreeException(422, "Unable to validate payload against " + existingResource) })();
        // Two reasons for passing through the request (and not performing validation):
        // 1. Validation returns no locators, meaning the parent container is not managed
        // 2. We're creating a resource and it has already passed validation
        if (validationContext === null || validationContext.getParentContainerLocators() === null || validationContext.getValidatingShapeTree() === null || shapeTreeRequest.getResourceType() !== ShapeTreeResourceType.CONTAINER) {
          return ShapeTreeValidationResponse.passThroughResponse();
        }

        // We're creating a container, have already passed validation and will now call Plant as it may
        // lead to nested static content to be created.  We will iterate the shapeTreeLocator meta data
        // which describe the ShapeTrees present on the container.
        const results: ShapeTreePlantResult[] = new Array();
        for (const locator of validationContext.getParentContainerLocators()) {

          if (requestedName.endsWith("/")) {
            requestedName = requestedName.replace("/", "");
          }
          const result: ShapeTreePlantResult = await this.plantShapeTreeLocator(shapeTreeContext, existingResource, shapeTreeRequest.getBody() || '' /* @@ */, shapeTreeRequest.getContentType() || 'text/turtle' /* @@ */, locator, validationContext.getValidatingShapeTree()!! /* @@ */, requestedName) ||
            (() => { throw new ShapeTreeException(422, "Unable to plant ShapeTree " + locator.getShapeTree()) })();
          results.push(result);
        }

        return ValidatingPostMethodHandler.createPlantResponse(results, shapeTreeRequest);
      }
    } catch (e) {
      if (e instanceof ShapeTreeException)
        return new ShapeTreeValidationResponse(e);
      // @@ if (e instanceof URISyntaxException)
      //   return new ShapeTreeValidationResponse(new ShapeTreeException(400, "Value of 'ShapeTree' link header is not a value URI"));
      if (e instanceof Error)
        return new ShapeTreeValidationResponse(new ShapeTreeException(500, e.message));
    }
  }

  private async validateRequestBody(shapeTreeRequest: ShapeTreeRequest<any>, graphToValidate: Store, baseURI: URL, shapeTreesToPlant: ShapeTree[]): Promise<void> /* throws IOException, URISyntaxException */ {
    const validatingShapeTree: ShapeTree = this.getShapeTreeWithShapeURI(shapeTreesToPlant) ||
      (() => { throw new ShapeTreeException(422, "Failed to plant shape trees " + shapeTreesToPlant.map(st => st.getId()).join('\n,')) })();

    let validationResult: ValidationResult | null = null;
    // If there is a graph to validate...and a ShapeTree indicates it wants to validate the container body
    if (graphToValidate !== null && validatingShapeTree !== null && validatingShapeTree.getValidatedByShapeUri() !== null) {
      // ...and a focus node was provided via the focusNode header, then we perform our validation
      const focusNodeURI: URL = this.getIncomingResolvedFocusNode(shapeTreeRequest, baseURI);
      validationResult = await validatingShapeTree.validateContent(graphToValidate, focusNodeURI, shapeTreeRequest.getResourceType());
    }

    // If there is a body graph and it did not pass validation, return an error
    if (graphToValidate !== null && validationResult !== null && validationResult.getValid() === false) {
      throw new ShapeTreeException(422, "Payload did not meet requirements defined by ShapeTree " + validatingShapeTree.getURI());
    }
  }

  private async validateShapeTrees(shapeTreeContext: ShapeTreeContext, requestURI: URL, requestedName: string, shapeTreesToPlant: ShapeTree[]): Promise<void> /* throws IOException, URISyntaxException */ {

    const targetContainerURI: URL = new URL(requestedName, requestURI);

    // Determine if the target container exists, if so, retrieve any existing ShapeTrees to validate alongside the newly requested ones
    const targetContainerResource: ShapeTreeResource = this.resourceAccessor.getResource(shapeTreeContext, targetContainerURI);
    if (targetContainerResource.isExists()) {
      const targetContainerMetadataResource: ShapeTreeResource = this.getShapeTreeMetadataResourceForResource(shapeTreeContext, targetContainerResource);
      if (targetContainerMetadataResource.isExists()) {
        const targetContainerMetadataGraph: Store = this.getGraphForResource(targetContainerMetadataResource, targetContainerURI) ||
          (() => { throw new ShapeTreeException(422, "Unable to read graph from " + targetContainerURI) })();
        const locators: ShapeTreeLocator[] = ShapeTreeLocator.getShapeTreeLocatorsFromGraph(targetContainerMetadataGraph);
        for (const locator of locators) {
          const shapeTree: ShapeTree | null = await ShapeTreeFactory.getShapeTree(new URL(locator.getShapeTree()));
          if (shapeTree !== null) {
            log.debug("Found ShapeTree [{}] already planted in existing container, adding to list to validate", shapeTree.getURI());
            shapeTreesToPlant.add(shapeTree);
          } else {
            throw new ShapeTreeException(500, "Existing container is managed by a shape tree " + locator.getShapeTree() + " which cannot be found");
          }
        }
      }
    }

    let foundShapeURI: string | null = null;
    let foundContents: URL[] | null = null;

    for (const shapeTree of shapeTreesToPlant) {
      if (shapeTree.getExpectedResourceType() !== ShapeTreeVocabulary.SHAPETREE_CONTAINER) {
        throw new ShapeTreeException(400, "The root of any ShapeTree hierarchy must be of type Container");
      }
      if (shapeTree.getValidatedByShapeUri() !== null) {
        if (foundShapeURI === null) {
          foundShapeURI = shapeTree.getValidatedByShapeUri();
        } else {
          throw new ShapeTreeException(400, "Only one ShapeTree provided can specify a ShapeURI");
        }
      }

      if (shapeTree.getContains() !== null && shapeTree.getContains().length !== 0) {
        if (foundContents === null) {
          foundContents = shapeTree.getContains();
        } else {
          throw new ShapeTreeException(400, "Only one ShapeTree provided can specify Contents");
        }
      }
    }
  }

  private ensureRequestResourceExists(shapeTreeResource: ShapeTreeResource, message: string): void /* throws ShapeTreeException */ {
    if (!shapeTreeResource.isExists()) {
      throw new ShapeTreeException(404, message);
    }
  }

  private getIncomingHeaderValueWithDefault(shapeTreeRequest: ShapeTreeRequest<any>, headerName: string, defaultValue: string): string {
    if (shapeTreeRequest.getHeaders().has(headerName)) {
      return (shapeTreeRequest.getHeaders().get(headerName) || [defaultValue])[0];
    } else {
      return defaultValue;
    }
  }

  protected getIncomingLinkHeaderByRelationValue(shapeTreeRequest: ShapeTreeRequest<any>, relation: string): string[] {
    if (shapeTreeRequest.getLinkHeaders().has(relation)) {
      return shapeTreeRequest.getLinkHeaders().get(relation) ||
        (() => { throw new ShapeTreeException(422, "Link header not set: " + relation) })();
    }
    return new Array();
  }
}

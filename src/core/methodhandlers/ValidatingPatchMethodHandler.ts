import log from 'loglevel';
import { URL } from 'url';
import { DataFactory, Store } from 'n3';
import { ShapeTreeResourceType } from '@core/enums';
import { ResourceAccessor } from '@core/ResourceAccessor';
import { ShapeTreeRequest } from '@core/ShapeTreeRequest';
import { ShapeTreeValidationResponse } from '@core/ShapeTreeValidationResponse';
import { ShapeTreeException } from '@core/exceptions';
import { ShapeTreeContext } from '@core/models/ShapeTreeContext';
import { ShapeTreeResource } from '@core/ShapeTreeResource';
import { ShapeTreeVocabulary } from '@core/vocabularies/ShapeTreeVocabulary';
import { ShapeTreeLocator } from '@core/models/ShapeTreeLocator';
import { ShapeTree } from '@core/models/ShapeTree';
import { ShapeTreeFactory } from '@core/ShapeTreeFactory';
import { ValidationResult } from '@core/models/ValidationResult';
import { AbstractValidatingMethodHandler } from './AbstractValidatingMethodHandler';
import { ValidatingMethodHandler } from './ValidatingMethodHandler';

// @Slf4j
export class ValidatingPatchMethodHandler extends AbstractValidatingMethodHandler implements ValidatingMethodHandler {

  public constructor(resourceAccessor: ResourceAccessor) {
    super(resourceAccessor);
  }

  // @Override
  public async validateRequest(shapeTreeRequest: ShapeTreeRequest<any>): Promise<ShapeTreeValidationResponse> {
    try {
      if (shapeTreeRequest.getContentType() === null || shapeTreeRequest.getContentType()!!.toLowerCase() !== 'application/sparql-update'.toLowerCase()) {
        log.error('Received a patch without a content type of application/sparql-update');
        throw new ShapeTreeException(415, 'PATCH verb expects a content type of application/sparql-update');
      }

      const shapeTreeContext: ShapeTreeContext = this.buildContextFromRequest(shapeTreeRequest);
      const existingResource: ShapeTreeResource = await this.getRequestResource(shapeTreeContext, shapeTreeRequest);
      const resourceType: ShapeTreeResourceType = this.determineResourceType(shapeTreeRequest, existingResource);
      shapeTreeRequest.setResourceType(resourceType);

      // Get the parent container URI
      const parentURI: URL = this.getParentContainerURI(existingResource);
      // Get requested name (resource being PATCHed)
      const requestedName: string = this.getRequestResourceName(existingResource);
      // Dereference parent container
      const parentContainerResource: ShapeTreeResource = await this.resourceAccessor.getResource(shapeTreeContext, parentURI);
      const parentContainerMetadataResource: ShapeTreeResource = await this.getShapeTreeMetadataResourceForResource(shapeTreeContext, parentContainerResource);
      // Retrieve graph of parent container metadata resource
      const parentContainerMetadataGraph: Store | null = this.getGraphForResource(parentContainerMetadataResource, parentURI);

      const normalizedBaseURI: URL = this.normalizeBaseURI(existingResource.getUri(), null, resourceType);
      // Get the shape tree that manages that container
      const shapeTreeManagedContainer: boolean = parentContainerMetadataGraph != null && parentContainerMetadataGraph.getQuads(null, DataFactory.namedNode(ShapeTreeVocabulary.HAS_SHAPE_TREE_LOCATOR), null, null).length > 0;
      // If managed, do validation
      if (shapeTreeManagedContainer) {

        const shapeTreeLocatorMetadatas: ShapeTreeLocator[] = ShapeTreeLocator.getShapeTreeLocatorsFromGraph(parentContainerMetadataGraph!!);

        const shapeTrees: ShapeTree[] = new Array();
        for (const locator of shapeTreeLocatorMetadatas) {
          shapeTrees.push(await ShapeTreeFactory.getShapeTree(new URL(locator.getShapeTree())) ||
            (() => { throw new ShapeTreeException(422, 'Failed to load shape tree ' + locator.getShapeTree()); })());
        }

        const validatingShapeTree: ShapeTree = this.getShapeTreeWithContents(shapeTrees) ||
          (() => { throw new ShapeTreeException(422, 'Expected contains predicate in ' + shapeTrees.map((st) => st.getId())); })();

        /* This is the ShapeTree that the container being created must adhere to
           it is identified by traversing the ShapeTrees contained within containerShapeTree
           and finding the one:
            - whose uriTemplate matches the Slug of the container we're about to create
            - whose URI matches the target shape tree hint provided via Link header
         */
        const targetShapeTreeHint: URL | null = this.getIncomingTargetShapeTreeHint(shapeTreeRequest);
        const targetShapeTree: ShapeTree | null = await validatingShapeTree.findMatchingContainsShapeTree(requestedName, targetShapeTreeHint, resourceType);

        let validationResult: ValidationResult | null = null;
        if (targetShapeTree !== null) {
          // Get existing resource graph (prior to PATCH)
          let existingResourceGraph: Store | null = this.getGraphForResource(existingResource, normalizedBaseURI);
          if (existingResourceGraph == null) {
            log.debug('Existing graph to patch does not exist.  Creating an empty graph.');
            existingResourceGraph = new Store();
          }

          // Perform a SPARQL update locally to ensure that resulting graph validates against ShapeTree
          // !! need a SPARQL patch implementation
          // const updateRequest: UpdateRequest = UpdateFactory.create(shapeTreeRequest.getBody(), normalizedBaseURI.toString());
          // UpdateAction.execute(updateRequest, existingResourceGraph);

          if (existingResourceGraph == null) {
            throw new ShapeTreeException(400, 'No graph after update');
          }

          const focusNodeURI: URL = this.getIncomingResolvedFocusNode(shapeTreeRequest, normalizedBaseURI);
          validationResult = await targetShapeTree.validateContent(existingResourceGraph, focusNodeURI, resourceType);
        }

        if (targetShapeTree === null || validationResult!!.getValid()) {
          return ShapeTreeValidationResponse.passThroughResponse();
        } else {
          // Otherwise, return a validation error
          throw new ShapeTreeException(422, 'Payload did not meet requirements defined by ShapeTree ' + targetShapeTree.getURI());
        }
      } else {
        // If the parent container is not managed, then pass through the PATCH
        return ShapeTreeValidationResponse.passThroughResponse();
      }
    } catch (ex) {
      if (ex instanceof ShapeTreeException) {
        return new ShapeTreeValidationResponse(ex);
      }
      return new ShapeTreeValidationResponse(new ShapeTreeException(500, ex.message));
    }
  }
}

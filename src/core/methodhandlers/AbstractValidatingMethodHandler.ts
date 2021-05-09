/**
 * Abstract class providing reusable functionality to different method handlers
 */

import log from 'loglevel';
import { URL } from 'url';
import { v4 as uuid } from 'uuid';
import { DataFactory, Store, Triple } from 'n3';
import { HttpHeaders, LinkRelations, ShapeTreeResourceType } from '@core/enums';
import { ShapeTreeException } from '@core/exceptions';
import { ShapeTreeContext } from '@core/models/ShapeTreeContext';
import { ResourceAccessor } from '@core/ResourceAccessor';
import { ShapeTreeRequest } from '@core/ShapeTreeRequest';
import { ShapeTreeResource } from '@core/ShapeTreeResource';
import { LdpVocabulary } from '@core/vocabularies';
import { GraphHelper } from '@core/helpers/GraphHelper';
import { ShapeTreePlantResult } from '@core/models/ShapeTreePlantResult';
import { ShapeTreeValidationResponse } from '@core/ShapeTreeValidationResponse';
import { ShapeTree } from '@core/models/ShapeTree';
import { HttpHeaderHelper } from '@core/helpers/HttpHeaderHelper';
import { ValidationContext } from '@core/models/ValidationContext';
import { ShapeTreeLocator } from '@core/models/ShapeTreeLocator';
import { ShapeTreeFactory } from '@core/ShapeTreeFactory';
import { ValidationResult } from '@core/models/ValidationResult';
import { ShapeTreeVocabulary } from '@core/vocabularies/ShapeTreeVocabulary';

type UUID = string; // @@ any way to make that stronger?

// @Slf4j
export abstract class AbstractValidatingMethodHandler {
  public static TEXT_TURTLE: string = 'text/turtle';
  protected resourceAccessor: ResourceAccessor;
  protected supportedRDFContentTypes: string[] = [AbstractValidatingMethodHandler.TEXT_TURTLE, 'application/rdf+xml', 'application/n-triples', 'application/ld+json'];
  /* @@ private */ static REL_TYPE_CONTAINER: string = '<' + LdpVocabulary.CONTAINER + '>; rel="' + LinkRelations.TYPE + '"';

  protected constructor(resourceAccessor: ResourceAccessor) {
    this.resourceAccessor = resourceAccessor;
  }

  /**
   * Builds a ShapeTreeContext from the incoming request.  Specifically it retrieves
   * the incoming Authorization header and stashes that value for use on any additional requests made during
   * validation.
   * @param shapeTreeRequest Incoming request
   * @return ShapeTreeContext object populated with authentication details, if present
   */
  protected buildContextFromRequest(shapeTreeRequest: ShapeTreeRequest<any>): ShapeTreeContext {
    const context: ShapeTreeContext = new ShapeTreeContext();
    context.setAuthorizationHeaderValue(shapeTreeRequest.getHeaderValue(HttpHeaders.AUTHORIZATION) || null);
    return context;
  }

  /**
   * Retrieves a representation of the resource present at the URI of the incoming ShapeTreeRequest
   * @param context ShapeTreeContext used for authentication
   * @param shapeTreeRequest Incoming request to retrieve resource URI from
   * @return ShapeTreeResource representation of that URI
   * @throws ShapeTreeException ShapeTreeException
   */
  protected getRequestResource(context: ShapeTreeContext, shapeTreeRequest: ShapeTreeRequest<any>): Promise<ShapeTreeResource> /* throws ShapeTreeException */ {
    return this.resourceAccessor.getResource(context, shapeTreeRequest.getURI());
  }

  /**
   * This determines the type of resource being processed.
   *
   * Initial test is based on the incoming request headers, specifically the Content-Type header.
   * If the content type is not one of the accepted RDF types, it will be treated as a NON-RDF source.
   *
   * Then the determination becomes whether or not the resource is a container.
   *
   * If it is a PATCH or PUT and the URI provided already exists, then the existing resource's Link header(s)
   * are used to determine if it is a container or not.
   *
   * If it is a POST or if the resource does not already exist, the incoming request Link header(s) are relied
   * upon.
   *
   * @param shapeTreeRequest The current incoming request
   * @param existingResource The resource located at the incoming request's URI
   * @return ShapeTreeResourceType aligning to current request
   * @throws ShapeTreeException ShapeTreeException throw, specifically if Content-Type is not included on request
   */
  protected determineResourceType(shapeTreeRequest: ShapeTreeRequest<any>, existingResource: ShapeTreeResource): ShapeTreeResourceType /* throws ShapeTreeException */ {
    let isNonRdf: boolean;
    if (shapeTreeRequest.getMethod() !== 'DELETE') {
      const incomingRequestContentType: string | null = shapeTreeRequest.getContentType() || null;
      // Ensure a content-type is present
      if (incomingRequestContentType === null) {
        throw new ShapeTreeException(400, 'Content-Type is required');
      }

      isNonRdf = this.determineIsNonRdfSource(incomingRequestContentType);
    } else {
      isNonRdf = false;
    }

    if (isNonRdf) {
      return ShapeTreeResourceType.NON_RDF;
    }

    const resourceAlreadyExists: boolean = existingResource.isExists();
    let isContainer: boolean = false;
    if ((shapeTreeRequest.getMethod() === 'PUT' || shapeTreeRequest.getMethod() === 'PATCH') && resourceAlreadyExists) {
      isContainer = existingResource.isContainer();
    } else if (shapeTreeRequest.getLinkHeaders() != null) {
      isContainer = this.getIsContainerFromIncomingLinkHeaders(shapeTreeRequest);
    }

    return isContainer ? ShapeTreeResourceType.CONTAINER : ShapeTreeResourceType.RESOURCE;
  }

  /**
   * Normalizes the BaseURI to use for a request based on the incoming request.
   * @param uri URI of request
   * @param requestedName Requested name of resource (provided on created resources via POST)
   * @param resourceType Description of resource (Container, NonRDF, Resource)
   * @return BaseURI to use for RDF Graphs
   * @throws URISyntaxException URISyntaxException
   */
  protected normalizeBaseURI(uri: URL, requestedName: string | null, resourceType: ShapeTreeResourceType): URL /* throws URISyntaxException */ {
    let uriString: string = uri.href;
    if (requestedName !== null) {
      uriString += requestedName;
    }
    if (resourceType === ShapeTreeResourceType.CONTAINER && !uriString.endsWith('/')) {
      uriString += '/';
    }
    return new URL(uriString);
  }

  /**
   * Loads body of request into graph
   * @param shapeTreeRequest Request
   * @param baseURI BaseURI to use for graph
   * @return Graph representation of request body
   * @throws ShapeTreeException ShapeTreeException
   */
  protected getIncomingBodyGraph(shapeTreeRequest: ShapeTreeRequest<any>, baseURI: URL): Store | null /* throws ShapeTreeException */ {
    log.debug('Reading request body into graph with baseURI {}', baseURI);

    if (shapeTreeRequest.getResourceType() !== ShapeTreeResourceType.NON_RDF &&
      shapeTreeRequest.getBody() !== null &&
      shapeTreeRequest.getBody()!!.length > 0) {
      return GraphHelper.readStringIntoGraph(baseURI, shapeTreeRequest.getBody() || '', shapeTreeRequest.getContentType() || AbstractValidatingMethodHandler.TEXT_TURTLE /* @@ default not in java code */);
    }
    return null;
  }

  /**
   * Gets focus node from request header
   * @param shapeTreeRequest Request
   * @param baseURI Base URI for use on relative focus nodes
   * @return URI of focus node
   * @throws IOException IOException
   */
  protected getIncomingResolvedFocusNode(shapeTreeRequest: ShapeTreeRequest<any>, baseURI: URL): URL /* throws IOException */ {
    const focus: string[] | undefined = shapeTreeRequest.getLinkHeaders().get(LinkRelations.FOCUS_NODE);
    if (focus !== undefined && focus.length !== 0) {
      const focusNode: string = focus[0];
      return new URL(focusNode, baseURI);
    }
    throw new ShapeTreeException(400, 'No Link header with relation ' + LinkRelations.FOCUS_NODE + ' supplied, unable to perform Shape validation');
  }

  /**
   * Gets target shape tree / hint from request header
   * @param shapeTreeRequest Request
   * @return URI value of target shape tree
   * @throws URISyntaxException URISyntaxException
   */
  protected getIncomingTargetShapeTreeHint(shapeTreeRequest: ShapeTreeRequest<any>): URL | null /* throws URISyntaxException */ {
    const hint: string[] | undefined = shapeTreeRequest.getLinkHeaders().get(LinkRelations.TARGET_SHAPETREE);
    if (hint !== undefined && hint.length !== 0) {
      return new URL(hint[0]);
    }
    return null;
  }

  /**
   * Determines if a resource should be treated as a container based on its request Link headers
   * @param shapeTreeRequest Request
   * @return Is the resource a container?
   */
  protected getIsContainerFromIncomingLinkHeaders(shapeTreeRequest: ShapeTreeRequest<any>): boolean {
    if (shapeTreeRequest.getLinkHeaders() != null && shapeTreeRequest.getLinkHeaders().get(LinkRelations.TYPE) != null) {
      const links: string[] | undefined = shapeTreeRequest.getLinkHeaders().get(LinkRelations.TYPE);
      return (links !== undefined && (
        links.indexOf('' + LdpVocabulary.CONTAINER) !== -1 ||
        links.indexOf('' + LdpVocabulary.BASIC_CONTAINER) === -1
      ));
    }
    return false;
  }

  /**
   * Identifies the appropriate plant result to return based on a collection of plant results
   * @param plantResults Collection of ShapeTreePlantResult
   * @param request Request
   * @return ShapeTreeValidationResponse representing the appropriate plant response
   */
  protected static createPlantResponse(plantResults: ShapeTreePlantResult[], request: ShapeTreeRequest<any>): ShapeTreeValidationResponse {

    // As multiple ShapeTrees can be planted at once, if there is more than ShapeTree relation Link header,
    // the response to the POST will be for the ShapeTree that was requested first.
    let primaryPlantResult: ShapeTreePlantResult | null = null;
    if (plantResults.length > 1) {
      const linkHeaders: Map<string, string[]> = request.getLinkHeaders();
      const shapeTrees: string[] | undefined = linkHeaders.get(LinkRelations.SHAPETREE);
      if (shapeTrees && shapeTrees.length === 1) {
        const primaryShapeTreeURI: string = shapeTrees[0];
        for (const plantResult of plantResults) {
          if (plantResult.getShapeTreeURI().toString() === primaryShapeTreeURI) {
            primaryPlantResult = plantResult;
            break;
          }
        }
      }
    } else {
      [primaryPlantResult] = plantResults;
    }

    if (primaryPlantResult === null) {
      const message = 'Unable to find "primary" plant result in createPlantResponse';
      log.error(message);
      return new ShapeTreeValidationResponse(new ShapeTreeException(400, message));
    } else {
      const response =  new ShapeTreeValidationResponse(201, '');
      response.addResponseHeader(HttpHeaders.LOCATION, primaryPlantResult.getRootContainer().toString());
      response.addResponseHeader(HttpHeaders.LINK, '<' + primaryPlantResult.getRootContainerMetadata().toString() + '>; rel="' + LinkRelations.SHAPETREE + '"');
      response.addResponseHeader(HttpHeaders.CONTENT_TYPE, AbstractValidatingMethodHandler.TEXT_TURTLE);
      return response;
    }
  }

  /**
   * Determines whether a content type is a supported RDF type
   * @param incomingRequestContentType Content type to test
   * @return Boolean indicating whether it is RDF or not
   */
  protected determineIsNonRdfSource(incomingRequestContentType: string): boolean {
    return this.supportedRDFContentTypes.indexOf(incomingRequestContentType.toLowerCase()) === -1;
  }

  /**
   * Returns parent container URI for a given resource
   * @param shapeTreeResource Resource
   * @return URI to the resource's parent container
   */
  protected getParentContainerURI(shapeTreeResource: ShapeTreeResource): URL {
    return new URL(shapeTreeResource.isContainer() ? '..' : '.', shapeTreeResource.getUri());
  }

  /**
   * Returns resource name from a resource URI
   * @param shapeTreeResource Resource
   * @return Resource name
   */
  protected getRequestResourceName(shapeTreeResource: ShapeTreeResource): string {
    return shapeTreeResource.getUri().toString().replace(this.getParentContainerURI(shapeTreeResource).toString(), '');
  }

  /**
   * Returns a ShapeTree from list of shape trees that has a validatedByShape predicate
   * @param shapeTreesToPlant List of shape trees to test
   * @return Shape tree that has a shape URI
   */
  protected getShapeTreeWithShapeURI(shapeTreesToPlant: ShapeTree[]): ShapeTree | null {
    for (const shapeTree of shapeTreesToPlant) {
      if (shapeTree.getValidatedByShapeUri() != null) {
        return shapeTree;
      }
    }
    return null;
  }

  /**
   * Returns a ShapeTree from list of shape trees that has a contains predicate
   * @param shapeTreesToPlant List of shape trees to test
   * @return Shape tree that has one or more contents
   */
  protected getShapeTreeWithContents(shapeTreesToPlant: ShapeTree[]): ShapeTree | null {
    for (const shapeTree of shapeTreesToPlant) {
      if (shapeTree.getContains() !== null && shapeTree.getContains().length !== 0) {
        return shapeTree;
      }
    }
    return null;
  }

  /**
   * Returns URI of shape tree auxiliary resource for a given resource
   * @param shapeTreeResource resource
   * @return URI to shape tree auxiliary resource
   * @throws ShapeTreeException ShapeTreeException
   */
  protected getShapeTreeMetadataURIForResource(shapeTreeResource: ShapeTreeResource): URL /* throws ShapeTreeException */ {
    const attr = '' + HttpHeaders.LINK.toLowerCase();
    const linkHeaders: Map<string, string[]> = HttpHeaderHelper.parseLinkHeadersToMap(shapeTreeResource.getAttributes().get(attr));

    if (!linkHeaders.has(LinkRelations.SHAPETREE)) {
      log.error('The resource {} does not contain a link header of {}', shapeTreeResource.getUri(), LinkRelations.SHAPETREE);
      throw new ShapeTreeException(500, 'No Link header with relation of ' + LinkRelations.SHAPETREE + ' found');
    }
    const metaDataURIStringHeaders: string[] | undefined = linkHeaders.get(LinkRelations.SHAPETREE);
    const metaDataURIString: string | null = metaDataURIStringHeaders === undefined ? null : metaDataURIStringHeaders[0];
    if (metaDataURIString == null) {
      throw new ShapeTreeException(500, 'No Link header with relation of ' + LinkRelations.SHAPETREE + ' found');
    }
    return new URL(metaDataURIString, shapeTreeResource.getUri());
  }

  /**
   * Returns shape tree auxiliary resource for a given resource
   * @param shapeTreeResource resource
   * @return shape tree auxiliary resource
   * @throws ShapeTreeException ShapeTreeException
   */
  protected getShapeTreeMetadataResourceForResource(shapeTreeContext: ShapeTreeContext, shapeTreeResource: ShapeTreeResource): Promise<ShapeTreeResource> /* throws ShapeTreeException */ {
    return this.resourceAccessor.getResource(shapeTreeContext, this.getShapeTreeMetadataURIForResource(shapeTreeResource));
  }

  /**
   * Returns a graph representation of a resource
   * @param resource Resource to get graph of
   * @param baseURI BaseURI to use for triples
   * @return Graph representation of resource
   * @throws ShapeTreeException ShapeTreeException
   */
  protected getGraphForResource(resource: ShapeTreeResource, baseURI: URL): Store | null /* throws ShapeTreeException */ {
    if (!resource.isExists()) return null;

    return GraphHelper.readStringIntoGraph(baseURI, resource.getBody() || '' /* @@ */, resource.getFirstAttributeValue(HttpHeaders.CONTENT_TYPE) || AbstractValidatingMethodHandler.TEXT_TURTLE /* @@ */);
  }

  /**
   * Determines whether a graph is valid for a given parent container
   * @param shapeTreeContext ShapeTreeContext used for authentication
   * @param graphToValidate Graph contents to be validated
   * @param baseURI BaseURI used for RDF graph
   * @param parentContainer Parent container to use for basis of validation (the shape trees managing this container
   *                        will be used to determine if the graph is valid)
   * @param resourceName Name of resource
   * @param shapeTreeRequest Request
   * @return ValidationContext with details of the validation process
   * @throws IOException IOException
   * @throws URISyntaxException URISyntaxException
   */
  protected async validateAgainstParentContainer(shapeTreeContext: ShapeTreeContext, graphToValidate: Store | null, baseURI: URL, parentContainer: ShapeTreeResource, resourceName: string, shapeTreeRequest: ShapeTreeRequest<any>): Promise<ValidationContext | null> /* throws IOException, URISyntaxException */ {
    const resourceType: ShapeTreeResourceType = shapeTreeRequest.getResourceType()!;
    if (resourceType === null) {
      throw new ShapeTreeException(500, 'Can\'t validate against parent of ' + resourceName + ' because we don\'t know its resourceType');
    }
    const parentContainerMetadataResource: ShapeTreeResource = await this.getShapeTreeMetadataResourceForResource(shapeTreeContext, parentContainer);
    // If there is no metadata for the parent container, it is not managed
    if (!parentContainerMetadataResource.isExists()) return null;

    const parentContainerMetadataGraph: Store | null = this.getGraphForResource(parentContainerMetadataResource, parentContainer.getUri()) ||
      (() => { throw new ShapeTreeException(422, 'No metadata graph for ' + parentContainer.getUri()); })();
    const locators: ShapeTreeLocator[] = ShapeTreeLocator.getShapeTreeLocatorsFromGraph(parentContainerMetadataGraph);

    // If there are no ShapeTree locators in the metadata graph, it is not managed
    if (locators.length === 0) return null;

    // This means the existing parent container has one or more ShapeTrees associated with it
    const existingShapeTrees: ShapeTree[] = await Promise.all(locators.map(
      (locator) => <Promise<ShapeTree>>(ShapeTreeFactory.getShapeTree(new URL(locator.getShapeTree())) ||
        (() => { throw new ShapeTreeException(422, 'Unable to locate ShapeTree ' + locator.getShapeTree()); })()),
    ));

    const shapeTreeWithContents: ShapeTree = this.getShapeTreeWithContents(existingShapeTrees) ||
      (() => { throw new ShapeTreeException(422, 'Expected contains predicate in ' + existingShapeTrees.map((st) => st.getId())); })();

    const targetShapeTreeHint: URL = this.getIncomingTargetShapeTreeHint(shapeTreeRequest) ||
      (() => { throw new ShapeTreeException(422, 'Unable to locate ShapeTree hint ' + shapeTreeRequest.getURI()); })();
    const targetShapeTree: ShapeTree | null = await shapeTreeWithContents.findMatchingContainsShapeTree(resourceName, targetShapeTreeHint, resourceType);

    // If no targetShapeTree is returned, it can be assumed that no validation is required
    let validationResult: ValidationResult | null = null;
    if (targetShapeTree !== null) {

      // If there is a graph to validate...and a ShapeTree indicates it wants to validate the container body
      if (graphToValidate != null && targetShapeTree.getValidatedByShapeUri() != null) {
        // ...and a focus node was provided via the focusNode header, then we perform our validation
        const focusNodeURI: URL = this.getIncomingResolvedFocusNode(shapeTreeRequest, baseURI);
        log.debug('Validating against parent container.  ST with Contents {}, Focus Node {}', shapeTreeWithContents.getURI(), focusNodeURI);
        validationResult = await targetShapeTree.validateContent(graphToValidate, focusNodeURI, resourceType);
      }

      // If there is a body graph and it did not pass validation, return an error
      if (graphToValidate != null && validationResult != null && !validationResult.getValid()) {
        throw new ShapeTreeException(422, 'Payload did not meet requirements defined by ShapeTree ' + targetShapeTree.getURI());
      }
    }

    return new ValidationContext(targetShapeTree, validationResult, locators);
  }

  /*
  protected plantShapeTree(shapeTreeContext: ShapeTreeContext, parentContainer: ShapeTreeResource, bodyGraph: Store ,                        rootShapeTree: ShapeTree       , rootContainer  : string,       shapeTree: ShapeTree, requestedName: string): ShapeTreePlantResult /* throws IOException, URISyntaxException * /
  protected plantShapeTree(shapeTreeContext: ShapeTreeContext, parentContainer: ShapeTreeResource, body     : string, contentType  : string, locator      : ShapeTreeLocator                         , targetShapeTree: ShapeTree, requestedName: string): ShapeTreePlantResult /* throws IOException, URISyntaxException * /
  protected plantShapeTree(shapeTreeContext: ShapeTreeContext, parentContainer: ShapeTreeResource, body     : string, contentType  : string, rootShapeTree: ShapeTree       , rootContainer  : string,       shapeTree: ShapeTree, requestedName: string): ShapeTreePlantResult /* throws IOException, URISyntaxException * /
  */

  protected plantShapeTreeStore(shapeTreeContext: ShapeTreeContext, parentContainer: ShapeTreeResource, bodyGraph: Store | null, rootShapeTree: ShapeTree, rootContainer: string | null, shapeTree: ShapeTree, requestedName: string | null): Promise<ShapeTreePlantResult> /* throws IOException, URISyntaxException */ {
    return this.plantShapeTree(shapeTreeContext, parentContainer, GraphHelper.writeGraphToTurtleString(bodyGraph) || '', AbstractValidatingMethodHandler.TEXT_TURTLE, rootShapeTree, rootContainer, shapeTree, requestedName);
  }

  protected async plantShapeTreeLocator(shapeTreeContext: ShapeTreeContext, parentContainer: ShapeTreeResource, body: string, contentType: string, locator: ShapeTreeLocator, targetShapeTree: ShapeTree, requestedName: string | null): Promise<ShapeTreePlantResult | null> /* throws IOException, URISyntaxException */ {
    const rootShapeTree: ShapeTree | null = await ShapeTreeFactory.getShapeTree(new URL(locator.getRootShapeTree()));
    if (rootShapeTree === null) {
      return null;
    }

    return this.plantShapeTree(shapeTreeContext, parentContainer, body, contentType, rootShapeTree, locator.getShapeTreeRoot(), targetShapeTree, requestedName);
  }

  protected async plantShapeTree(shapeTreeContext: ShapeTreeContext, parentContainer: ShapeTreeResource, body: string, contentType: string, rootShapeTree: ShapeTree, rootContainer: string | null, shapeTree: ShapeTree, requestedName: string | null): Promise<ShapeTreePlantResult> /* throws IOException, URISyntaxException */ {
    log.debug('plantShapeTree: parent [{}], root tree [{}], tree [{}], slug [{}], ', parentContainer.getUri(), rootShapeTree.getId(), shapeTree.getId(), requestedName);

    const plantedContainerResource: ShapeTreeResource = await this.createOrReuseContainer(shapeTreeContext, parentContainer.getUri(), requestedName, body, contentType);
    const plantedContainerMetadataResource: ShapeTreeResource = await this.getShapeTreeMetadataResourceForResource(shapeTreeContext, plantedContainerResource);

    // In a POST scenario where the container has not yet been created, it cannot be passed into plantShapeTree
    // hierarchy of recursive method calls.  So, if it is null, set it to the URI of the planted container.
    if (rootContainer === null) {
      // eslint-disable-next-line no-param-reassign
      rootContainer = plantedContainerResource.getUri().toString();
    }

    // Get the existing graph and reuse it, if possible, if not, create a new graph
    let plantedContainerMetadataGraph: Store;
    if (plantedContainerMetadataResource.isExists()) {
      plantedContainerMetadataGraph = this.getGraphForResource(plantedContainerMetadataResource, plantedContainerResource.getUri()) ||
        (() => { throw new ShapeTreeException(422, 'Unable to load graph ' + plantedContainerResource.getUri()); })();
    } else {
      plantedContainerMetadataGraph = new Store(); // DataFactory.createDefaultModel().getGraph();
    }

    // Generate a UUID for the ShapeTree
    const shapeTreeLocatorUUID: UUID = uuid();

    const triplesToAdd: Triple[] = new Array();
    // Add the triple for the new st:hasShapeTreeLocator
    const plantedContainerURI: string = plantedContainerResource.getUri().toString() + (plantedContainerResource.getUri().toString().endsWith('/') ? '' : '/');
    const shapeTreeLocatorURI: string = plantedContainerURI + '#' + shapeTreeLocatorUUID;
    triplesToAdd.push(new Triple(DataFactory.namedNode(plantedContainerURI), DataFactory.namedNode(ShapeTreeVocabulary.HAS_SHAPE_TREE_LOCATOR), DataFactory.namedNode(shapeTreeLocatorURI)));

    // Add the triples for the locator itself
    triplesToAdd.push(new Triple(DataFactory.namedNode(shapeTreeLocatorURI), DataFactory.namedNode(ShapeTreeVocabulary.HAS_SHAPE_TREE), DataFactory.namedNode(shapeTree.getId())));
    triplesToAdd.push(new Triple(DataFactory.namedNode(shapeTreeLocatorURI), DataFactory.namedNode(ShapeTreeVocabulary.HAS_SHAPE_TREE_INSTANCE_ROOT), DataFactory.namedNode(rootContainer)));
    triplesToAdd.push(new Triple(DataFactory.namedNode(shapeTreeLocatorURI), DataFactory.namedNode(ShapeTreeVocabulary.HAS_ROOT_SHAPE_TREE), DataFactory.namedNode(rootShapeTree.getId())));
    plantedContainerMetadataGraph.addQuads(triplesToAdd);

    plantedContainerMetadataResource.setBody(GraphHelper.writeGraphToTurtleString(plantedContainerMetadataGraph));

    // Write the updates back to the resource
    this.resourceAccessor.updateResource(shapeTreeContext, plantedContainerMetadataResource);

    const nestedContainersCreated: URL[] = new Array();

    // Recursively call plantShapeTree for any static, nested container contents -- resources and dynamically named containers are ignored
    for (const contentShapeTreeURI of shapeTree.getContains()) {
      const contentShapeTree: ShapeTree | null = await ShapeTreeFactory.getShapeTree(contentShapeTreeURI);
      if (contentShapeTree !== null && contentShapeTree.getLabel() != null) {
        const nestedResult: ShapeTreePlantResult = await this.plantShapeTree(shapeTreeContext, plantedContainerResource, '', AbstractValidatingMethodHandler.TEXT_TURTLE, rootShapeTree, rootContainer, contentShapeTree, contentShapeTree.getLabel());
        nestedContainersCreated.push(nestedResult.getRootContainer());
      }
    }

    return new ShapeTreePlantResult(shapeTree.getURI(), plantedContainerResource.getUri(), plantedContainerMetadataResource.getUri(), nestedContainersCreated);
  }

  private async createOrReuseContainer(shapeTreeContext: ShapeTreeContext, parentContainerURI: URL, requestedName: string | null, body: string, contentType: string): Promise<ShapeTreeResource> /* throws IOException */ {
    // First determine if we're looking to plant a ShapeTree in an existing container
    const targetContainerResource: ShapeTreeResource = await this.resourceAccessor.getResource(shapeTreeContext, new URL(parentContainerURI.toString() + requestedName));
    if (targetContainerResource.isExists()) {
      // If the container already exists, it will not be created again
      return targetContainerResource;
    } else {
      // Create new container with the Slug/Requested Name
      const headers: Map<string, string[]> = new Map();
      if (requestedName !== null)
        headers.set(HttpHeaders.SLUG, [requestedName]);
      headers.set(HttpHeaders.LINK, [AbstractValidatingMethodHandler.REL_TYPE_CONTAINER]);
      headers.set(HttpHeaders.CONTENT_TYPE, [contentType]);
      let shapeTreeContainerResource: ShapeTreeResource = await this.resourceAccessor.createResource(shapeTreeContext, parentContainerURI, headers, body, contentType);

      // Depending on server implementation, after a POST the response header may pertain to the parent container (the URI)
      // as opposed to the newly created resource.  To ensure we get the proper headers, we reload the contents of the
      // newly created container with a GET.
      shapeTreeContainerResource = await this.resourceAccessor.getResource(shapeTreeContext, shapeTreeContainerResource.getUri());
      return shapeTreeContainerResource;
    }
  }
}

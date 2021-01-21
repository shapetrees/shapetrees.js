import { URL } from 'url';
import { DocumentContentsLoader } from './contentloaders/DocumentContentsLoader';
import { HttpDocumentContentsLoader } from './contentloaders/HttpDocumentContentsLoader';
import { DocumentContents } from './models/DocumentContents';
import { ShapeTree } from './models/ShapeTree';

// @Slf4j
export class ShapeTreeFactory {
  private constructor() {
  }

  private static RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
  private static contentsLoader: DocumentContentsLoader = new HttpDocumentContentsLoader(null, null);

  private static localShapeTreeCache: Map<URL, ShapeTree> = new Map();

  public static setContentsLoader(contentsLoader: DocumentContentsLoader): void {
    ShapeTreeFactory.contentsLoader = contentsLoader;
  }

  public static getShapeTree(shapeTreeURI: URL): ShapeTree /* throws URISyntaxException, ShapeTreeException */ {
    if (this.isShapeTreeAllowIRI(shapeTreeURI)) {
      return null;
    }

    if (this.localShapeTreeCache.has(shapeTreeURI)) {
      log.debug("[{}] previously cached -- returning", shapeTreeURI.toString());
      return this.localShapeTreeCache.get(shapeTreeURI);
    }

    this.dereferenceAndParseShapeTreeResource(shapeTreeURI);

    return this.localShapeTreeCache.get(shapeTreeURI);
  }

  private static dereferenceAndParseShapeTreeResource(shapeTreeURI: URL): void /* throws URISyntaxException, ShapeTreeException */ {
    try {
      const contents: DocumentContents = this.contentsLoader.loadDocumentContents(shapeTreeURI);
      const model: Model = GraphHelper.readStringIntoModel(shapeTreeURI, contents.getBody(), contents.getContentType());
      const resource: Resource = model.getResource(shapeTreeURI.toString());
      this.recursivelyParseShapeTree(model, resource);
    } catch (rnfe/*: RiotNotFoundException */) {
      log.error("Unable to load graph at URI {}", shapeTreeURI);
    }
  }

  private static recursivelyParseShapeTree(model: Model, resource: Resource): void /* throws URISyntaxException, ShapeTreeException */ {
    const shapeTreeURIString: string = resource.getURI();
    log.debug("Entering recursivelyParseShapeTree for [{}]", shapeTreeURIString);
    const shapeTreeURI: URL = new URL(shapeTreeURIString);

    if (this.localShapeTreeCache.containsKey(shapeTreeURI)) {
      log.debug("[{}] previously cached -- returning", shapeTreeURIString);
      return;
    }

    const shapeTree: ShapeTree = new ShapeTree(contentsLoader);
    // Set the URI as the ID (string representation)
    shapeTree.setId(shapeTreeURIString);
    // Set the expected resource type
    const expectsType: string = this.getStringValue(model, resource, ShapeTreeVocabulary.EXPECTS_TYPE);
    if (expectsType == null) throw new ShapeTreeException(500, "Shape Tree :expectsType not found");
    shapeTree.setExpectedResourceType(expectsType);
    // Set Shape URI
    shapeTree.setValidatedByShapeUri(this.getStringValue(model, resource, ShapeTreeVocabulary.VALIDATED_BY));
    // Set Label
    shapeTree.setLabel(getStringValue(model, resource, RDFS_LABEL));
    // Set Supports
    shapeTree.setSupports(getStringValue(model, resource, ShapeTreeVocabulary.SUPPORTS));
    // Set Reference collection
    shapeTree.setReferences(new ArrayList<>());

    // Add the shapeTree to the cache before any of the recursive processing
    localShapeTreeCache.put(shapeTreeURI, shapeTree);

    const referencesProperty: Property = model.createProperty(ShapeTreeVocabulary.REFERENCES);
    if (resource.hasProperty(referencesProperty)) {
      const referenceStatements: Statement[] = resource.listProperties(referencesProperty).toList();
      for (const referenceStatement of referenceStatements) {

        const referenceResource: Resource = referenceStatement.getObject().asResource();
        const referenceShapeTreeUri: URL = new URL(getStringValue(model, referenceResource, ShapeTreeVocabulary.HAS_SHAPE_TREE));
        const shapePath: string = getStringValue(model, referenceResource, ShapeTreeVocabulary.TRAVERSE_VIA_SHAPE_PATH);
        if (!localShapeTreeCache.containsKey(referenceShapeTreeUri)) {
          // If the model contains the referenced ShapeTree, go ahead and parse and cache it
          recursivelyParseShapeTree(model, model.getResource(referenceShapeTreeUri.toString()));
        }

        // Create the object that defines there relation between a ShapeTree and its children
        const referencedShapeTree: ReferencedShapeTree = new ReferencedShapeTree(referenceShapeTreeUri, shapePath);
        shapeTree.getReferences().add(referencedShapeTree);
      }
    }

    // Containers are expected to have contents
    if (resource.hasProperty(model.createProperty(ShapeTreeVocabulary.CONTAINS)) && !shapeTree.getExpectedResourceType().equals(ShapeTreeVocabulary.SHAPETREE_CONTAINER)) {
      throw new ShapeTreeException(400, "Contents predicate not expected outside of #ShapeTreeContainer Types");
    }
    if (shapeTree.getExpectedResourceType().equals(ShapeTreeVocabulary.SHAPETREE_CONTAINER)) {
      const uris: URL[] = getURLListValue(model, resource, ShapeTreeVocabulary.CONTAINS);
      shapeTree.setContains(uris);
      for (const uri of uris) {
        if (!this.localShapeTreeCache.containsKey(uri) && !this.isShapeTreeAllowIRI(uri)) {
          this.recursivelyParseShapeTree(model, model.getResource(uri.toString()));
        }
      }
    }
  }

  private static isShapeTreeAllowIRI(uri: URL): boolean /* throws URISyntaxException */ {
    return uri.equals(new URL(ShapeTreeVocabulary.ALLOW_ALL)) ||
      uri.equals(new URL(ShapeTreeVocabulary.ALLOW_NONE)) ||
      uri.equals(new URL(ShapeTreeVocabulary.ALLOW_RESOURCES)) ||
      uri.equals(new URL(ShapeTreeVocabulary.ALLOW_CONTAINERS)) ||
      uri.equals(new URL(ShapeTreeVocabulary.ALLOW_NON_RDF_SOURCES));
  }

  private static getStringValue(model: Model, resource: Resource, predicate: string): string {
    const property: Property = model.createProperty(predicate);
    if (resource.hasProperty(property)) {
      const statement: Statement = resource.getProperty(property);
      if (statement.getObject().isLiteral()) {
        return statement.getObject().asLiteral().getString();
      } else if (statement.getObject().isURIResource()) {
        return statement.getObject().asResource().getURI();
      } else {
        log.error("In getStringValue for predicate [{}] unable to value of Node", predicate);
      }

    }
    return null;
  }

  private static getURLListValue(model: Model, resource: Resource, predicate: string): URL[] /* throws URISyntaxException */ {
    const uris: URL[] = new Array();
    const property: Property = model.createProperty(predicate);
    if (resource.hasProperty(property)) {
      const propertyStatements: Statement[] = resource.listProperties(property).toList();
      for (const propertyStatement of propertyStatements) {
        const propertyNode: Node = propertyStatement.getObject().asNode();
        if (propertyNode instanceof Node_URL) {
          const contentURI: URL = new URL(propertyNode.getURI());
          uris.add(contentURI);
        }
      }
    }
    return uris;
  }
}

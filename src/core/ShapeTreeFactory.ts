import log from 'loglevel';
import { URL } from 'url';
import { expectOneObject, expectType, expectTypes } from '@todo/graphHelper';
import {
  BlankNode, DataFactory, Literal, NamedNode, Quad, Store,
} from 'n3';
import { DocumentContentsLoader } from './contentloaders/DocumentContentsLoader';
import { HttpDocumentContentsLoader } from './contentloaders/HttpDocumentContentsLoader';
import { ShapeTreeException } from './exceptions';
import { GraphHelper } from './helpers/GraphHelper';
import { DocumentContents } from './models/DocumentContents';
import { ReferencedShapeTree } from './models/ReferencedShapeTree';
import { ShapeTree } from './models/ShapeTree';
import { ShapeTreeVocabulary } from './vocabularies/ShapeTreeVocabulary';

const nn = DataFactory.namedNode;

// @Slf4j
export class ShapeTreeFactory {
  private constructor() {
  }

  private static RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
  private static contentsLoader: DocumentContentsLoader = new HttpDocumentContentsLoader(null, null);

  private static localShapeTreeCache: Map<URL, ShapeTree> = new Map(); // @@ <string, ShapeTree> ?

  public static setContentsLoader(contentsLoader: DocumentContentsLoader): void {
    ShapeTreeFactory.contentsLoader = contentsLoader;
  }

  public static async getShapeTree(shapeTreeURI: URL): Promise<ShapeTree | null> /* throws URISyntaxException, ShapeTreeException */ {
    if (this.isShapeTreeAllowIRI(shapeTreeURI.href)) {
      return null;
    }

    if (this.localShapeTreeCache.has(shapeTreeURI)) {
      log.debug('[{}] previously cached -- returning', shapeTreeURI.toString());
      return this.localShapeTreeCache.get(shapeTreeURI) || null;
    }

    this.dereferenceAndParseShapeTreeResource(shapeTreeURI);

    return this.localShapeTreeCache.get(shapeTreeURI) || null;
  }

  private static async dereferenceAndParseShapeTreeResource(shapeTreeURI: URL): Promise<void> /* throws URISyntaxException, ShapeTreeException */ {
    try {
      const contents: DocumentContents = await this.contentsLoader.loadDocumentContents(shapeTreeURI);
      let body: string | null;
      // eslint-disable-next-line no-cond-assign
      if (contents === null || (body = contents.getBody()) === null) {
        throw new ShapeTreeException(422, 'Unable to load ShapeTree ' + shapeTreeURI);
      }
      const model: Store = GraphHelper.readStringIntoGraph(shapeTreeURI, body /* @@ */, contents.getContentType());
      const resource: NamedNode = nn(shapeTreeURI.toString());
      this.recursivelyParseShapeTree(model, resource);
    } catch (rnfe/*: RiotNotFoundException */) {
      log.error('Unable to load graph at URI {}', shapeTreeURI); // @@ I suspect this should throw.
    }
  }

  private static recursivelyParseShapeTree(model: Store, resource: NamedNode): void /* throws URISyntaxException, ShapeTreeException */ {
    const shapeTreeURIString: string = resource.value;
    log.debug('Entering recursivelyParseShapeTree for [{}]', shapeTreeURIString);
    const shapeTreeURI: URL = new URL(shapeTreeURIString);

    if (this.localShapeTreeCache.has(shapeTreeURI)) {
      log.debug('[{}] previously cached -- returning', shapeTreeURIString);
      return;
    }

    const expectsType = expectOneObject<NamedNode>(model, resource, nn(ShapeTreeVocabulary.EXPECTS_TYPE),
      () => { throw new ShapeTreeException(500, `Shape Tree ${resource.value} should have one st:expectsType`); });
    const shapeTree: ShapeTree = new ShapeTree(
      ShapeTreeFactory.contentsLoader,
      shapeTreeURIString, // Set the URI as the ID (string representation)
      expectsType.value, // Set the expected resource type
      ShapeTreeFactory.getStringValue(model, resource, ShapeTreeVocabulary.SUPPORTS), // Set Supports
      new Array(), // Set Reference collection
      this.getStringValue(model, resource, ShapeTreeVocabulary.VALIDATED_BY), // Set Shape URI
      ShapeTreeFactory.getStringValue(model, resource, ShapeTreeFactory.RDFS_LABEL), // Set Label
    );

    // Add the shapeTree to the cache before any of the recursive processing
    ShapeTreeFactory.localShapeTreeCache.set(shapeTreeURI, shapeTree);

    const referencesProperty: NamedNode = nn(ShapeTreeVocabulary.REFERENCES);
    const referenceStatements: Quad[] = model.getQuads(resource, referencesProperty, null, null);
    for (const referenceStatement of referenceStatements) {
      const referenceResource = expectType<NamedNode>(referenceStatement.object);
      const referenceShapeTreeUri = expectOneObject<NamedNode>(model, referenceResource, nn(ShapeTreeVocabulary.HAS_SHAPE_TREE),
        () => { throw new ShapeTreeException(500, `Shape Tree ${referenceResource.value} st:hasShapeTree not found`); });
      const shapePath = expectOneObject<Literal>(model, referenceResource, nn(ShapeTreeVocabulary.TRAVERSE_VIA_SHAPE_PATH),
        () => { throw new ShapeTreeException(500, `Shape Tree ${referenceResource.value} st:traverseViaShapePath not found`); });
      if (!ShapeTreeFactory.localShapeTreeCache.has(new URL(referenceShapeTreeUri.value))) {
        // If the model contains the referenced ShapeTree, go ahead and parse and cache it
        ShapeTreeFactory.recursivelyParseShapeTree(model, referenceShapeTreeUri);
      }

      // Create the object that defines there relation between a ShapeTree and its children
      const referencedShapeTree: ReferencedShapeTree = new ReferencedShapeTree(new URL(referenceShapeTreeUri.value), shapePath.value);
      shapeTree.getReferences().push(referencedShapeTree);
    }

    // Containers are expected to have contents
    if (model.getQuads(resource, ShapeTreeVocabulary.CONTAINS, null, null).length > 0 && shapeTree.getExpectedResourceType() !== ShapeTreeVocabulary.SHAPETREE_CONTAINER) {
      throw new ShapeTreeException(400, 'Contents predicate not expected outside of #ShapeTreeContainer Types'); // are schema errors 500s?
    }
    if (shapeTree.getExpectedResourceType() === ShapeTreeVocabulary.SHAPETREE_CONTAINER) {
      const uris: NamedNode[] = expectTypes<NamedNode>(model, resource, nn(ShapeTreeVocabulary.CONTAINS),
        (term) => { throw new ShapeTreeException(500, `Shape Tree ${resource.value} is a Container with no st:contains`); });
      if (uris.length === 0) {
        throw new ShapeTreeException(500, `Shape Tree ${resource.value} is a Container with no st:contains`);
      }
      shapeTree.setContains(uris.map((uri) => new URL(uri.value)));
      for (const uri of uris) {
        if (!this.localShapeTreeCache.has(new URL(uri.value)) && !this.isShapeTreeAllowIRI(uri.value)) {
          this.recursivelyParseShapeTree(model, nn(uri.value));
        }
      }
    }
  }

  private static isShapeTreeAllowIRI(uri: string): boolean /* throws URISyntaxException */ {
    return uri === ShapeTreeVocabulary.ALLOW_ALL
      || uri === ShapeTreeVocabulary.ALLOW_NONE
      || uri === ShapeTreeVocabulary.ALLOW_RESOURCES
      || uri === ShapeTreeVocabulary.ALLOW_CONTAINERS
      || uri === ShapeTreeVocabulary.ALLOW_NON_RDF_SOURCES;
  }

  private static getStringValue(model: Store, resource: NamedNode, predicate: string): string | null {
    const property: NamedNode = nn(predicate);
    const matches: Quad[] = model.getQuads(resource, property, null, null);
    if (matches.length === 0) {
      return null;
    }
    // @@ throw if there are too many? shapetrees-java returns a random one.
    const o = matches[0].object;
    if (o instanceof BlankNode) {
      // @@ should this throw?
      log.error('In getStringValue for predicate [{}] unable to value of Node', predicate);
      return null;
    }
    return o.value;
  }

  /* @@ delme? -- supplanted by expectsTypes
  private static getURLListValue(model: Store, resource: NamedNode, predicate: string): URL[] /* throws URISyntaxException * / {
    const uris: URL[] = new Array();
    const property: NamedNode = nn(predicate);
    if (resource.hasProperty(property)) {
      const propertyStatements: Statement[] = resource.listProperties(property).toList();
      for (const propertyStatement of propertyStatements) {
        const propertyNode: Node = propertyStatement.getObject().asNode();
        if (propertyNode instanceof Node_URL) {
          const contentURI: URL = new URL(propertyNode.getURI());
          uris.push(contentURI);
        }
      }
    }
    return uris;
  }
  */
}

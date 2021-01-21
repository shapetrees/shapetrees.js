// @Getter @Setter

import { DocumentContentsLoader } from '@core/contentloaders/DocumentContentsLoader';
import { RecursionMethods, ShapeTreeResourceType } from '@core/enums';
import { ShapeTreeException } from '@core/exceptions';
import { Store } from 'n3';
import { URL } from 'url';
import { ShExSchema } from '@todo/ShExSchema';
import { ShapeTreeVocabulary } from '@core/vocabularies/ShapeTreeVocabulary';
import { SchemaCache } from '@core/SchemaCache';
import log from 'loglevel';
import { ShapeTreeFactory } from '@core/ShapeTreeFactory';
import { ReferencedShapeTree } from './ReferencedShapeTree';
import { ValidationResult } from './ValidationResult';
import { DocumentContents } from './DocumentContents';

// @Slf4j
export class ShapeTree {
  private documentContentsLoader: DocumentContentsLoader;
  private id: string;
  private expectedResourceType: string;
  private validatedByShapeUri: string;
  private label: string;
  private supports: string;
  private contains: URL[] = new Array();
  private references: ReferencedShapeTree[];

  public constructor(documentContentsLoader: DocumentContentsLoader) {
    this.documentContentsLoader = documentContentsLoader;
  }

  getId(): string { return this.id; }
  setId(id: string): void { this.id = id; }
  getExpectedResourceType(): string { return this.expectedResourceType; }
  setExpectedResourceType(expectedResourceType: string): void { this.expectedResourceType = expectedResourceType; }
  getReferences(): ReferencedShapeTree[] { return this.references; }

  public getURI(): URL /* throws URISyntaxException */ {
    return new URL(this.id);
  }

  public validateContent(graph: Store, focusNodeURI: URL, resourceType: ShapeTreeResourceType): ValidationResult /* throws IOException, URISyntaxException */ {
    if (this.expectsContainer() !== (resourceType === ShapeTreeResourceType.CONTAINER)) {
      throw new ShapeTreeException(400, 'The resource type being validated does not match the type expected by the ShapeTree');
    }

    if (this.validatedByShapeUri == null) {
      throw new ShapeTreeException(400, 'Attempting to validate a ShapeTree (' + this.id + ') that does not have an associated Shape');
    }
    const resolvedShapeURI: URL = new URL(this.validatedByShapeUri, this.id);

    const shapeResourceURI: URL = resolvedShapeURI;
    if (resolvedShapeURI.hash.length) {
      shapeResourceURI.hash = '';
    }

    let schema: ShExSchema;
    if (SchemaCache.isInitialized() && SchemaCache.containsSchema(shapeResourceURI)) {
      log.debug('Found cached schema {}', shapeResourceURI);
      schema = SchemaCache.getSchema(shapeResourceURI)!!;
    } else {
      log.debug('Did not find schema in cache {} will retrieve and parse', shapeResourceURI);
      const shexShapeContents: DocumentContents = this.documentContentsLoader.loadDocumentContents(shapeResourceURI);
      if (shexShapeContents == null || shexShapeContents.getBody() == null || shexShapeContents.getBody().length === 0) {
        throw new ShapeTreeException(400, 'Attempting to validate a ShapeTree (' + this.id + ') - Shape at (' + resolvedShapeURI + ') is not found or is empty');
      }

      const shapeBody: string = shexShapeContents.getBody();
      /*
      const stream: InputStream = new ByteArrayInputStream(shapeBody.getBytes());
      const shexCParser: ShExCParser = new ShExCParser();
      try {
        schema = new ShExSchema(GlobalFactory.RDFFactory, shexCParser.getRules(stream), shexCParser.getStart());
        if (SchemaCache.isInitialized()) {
          SchemaCache.putSchema(shapeResourceURI, schema);
        }
      } catch (ex/*: Exception * /) {
        throw new ShapeTreeException(500, 'Error parsing ShEx schema - ' + ex.getMessage());
      }
      */
    }
    /*
    // Tell ShExJava we want to use Jena as our graph library
    const jenaRDF: JenaRDF = new org.apache.commons.rdf.jena.JenaRDF();
    GlobalFactory.RDFFactory = jenaRDF;

    const validation: ValidationAlgorithm = new RecursiveValidation(schema, jenaRDF.asGraph(graph));
    const shapeLabel: Label = new Label(GlobalFactory.RDFFactory.createIRI(this.validatedByShapeUri));
    const focusNode: IRI = GlobalFactory.RDFFactory.createIRI(focusNodeURI.toString());
    log.debug('Validating Shape Label = {}, Focus Node = {}', shapeLabel.toPrettyString(), focusNode.getIRIString());
    validation.validate(focusNode, shapeLabel);
    */

    const valid: boolean = true; // @@ validation.getTyping().isConformant(focusNode, shapeLabel);
    return new ValidationResult(valid);
  }

  public findMatchingContainsShapeTree(requestedName: string, targetShapeTreeHint: URL, resourceType: ShapeTreeResourceType): ShapeTree | null /* throws URISyntaxException, ShapeTreeException */ {
    if (/* @@ delme this.contains === null || */ this.contains.length === 0) {
      if (this.getExpectedResourceType() === ShapeTreeVocabulary.SHAPETREE_RESOURCE) {
        return this;
      }
      return null;
    }

    for (const childShapeTreeURI of this.contains) {
      const childShapeTree: ShapeTree = ShapeTreeFactory.getShapeTree(childShapeTreeURI);
      if (childShapeTree == null) {
        continue;
      }

      // Allow a target shape tree hint to be passed into matching to skip URITemplate matching
      if (targetShapeTreeHint != null) {
        if (this.contains.indexOf(targetShapeTreeHint) !== -1) {
          return childShapeTree;
        }
        throw new ShapeTreeException(422, 'A target shape tree hint was provided (' + targetShapeTreeHint + ') but it did not exist within :contains');
      }
    }

    // Within this block of code, it means a shape tree hint was not provided
    // At this point it must be decided if an unexpected resource is allowed to be created
    // Default behavior is assumed to be ALLOW_NONE

    // If ALLOW_NONE is explicitly set, reject
    if (this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_NONE)) {
      throw new ShapeTreeException(422, this.exceptionMessage(requestedName, this.getId(), 'Further, the :AllowNone was specified within :contents'));
    }

    // If none of the other ALLOW_* predicates are present, reject by default
    if (!this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_ALL)
      && !this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_NON_RDF_SOURCES)
      && !this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_CONTAINERS)
      && !this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_RESOURCES)) {
      throw new ShapeTreeException(422, this.exceptionMessage(requestedName, this.getId(), 'Further, no :Allows* are specified to mitigate'));
    }

    // If it is a non-RDF source and non-RDF sources are not explicitly allowed for...
    if (resourceType === ShapeTreeResourceType.NON_RDF
      && !this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_ALL)
      && !this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_NON_RDF_SOURCES)) {
      throw new ShapeTreeException(422, this.exceptionMessage(requestedName, this.getId(), 'Further, the requested resource is a NonRDFSource and :AllowNonRDFSources was not specified within :contents'));
    }
    // if it is a Container source and Container sources are not explicitly allowed for...
    if (resourceType === ShapeTreeResourceType.CONTAINER
      && !this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_ALL)
      && !this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_CONTAINERS)) {
      throw new ShapeTreeException(422, this.exceptionMessage(requestedName, this.getId(), 'Further, the requested resource is a Container and :AllowContainers was not specified within :contents'));
    }
    //
    if (resourceType === ShapeTreeResourceType.RESOURCE
      && !this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_ALL)
      && !this.contains.find((u) => u.href === ShapeTreeVocabulary.ALLOW_RESOURCES)) {
      throw new ShapeTreeException(422, this.exceptionMessage(requestedName, this.getId(), 'Further, the requested resource is a Resource and :AllowResources was not specified within :contents'));
    }
    // If we return null, it will indicate there is nothing to validate against, and that's okay
    // because we've already validated if the type of incoming Resource is allowed in the absence of a
    // URI template match
    return null;
  }

  public getReferencedShapeTrees(recursionMethods: RecursionMethods = RecursionMethods.DEPTH_FIRST): Iterator<ReferencedShapeTree> /* throws URISyntaxException, ShapeTreeException */ {
    return this.getReferencedShapeTreesList(recursionMethods).iterator();
  }

  private expectsContainer(): boolean {
    return this.getExpectedResourceType() !== null && this.getExpectedResourceType() === ShapeTreeVocabulary.SHAPETREE_CONTAINER;
  }

  private getReferencedShapeTreesList(recursionMethods: RecursionMethods): ReferencedShapeTree[] /* throws URISyntaxException, ShapeTreeException */ {
    if (recursionMethods === RecursionMethods.BREADTH_FIRST) {
      return this.getReferencedShapeTreesListBreadthFirst();
    }
    const referencedShapeTrees: ReferencedShapeTree[] = new Array();
    return this.getReferencedShapeTreesListDepthFirst(this.getReferences(), referencedShapeTrees);
  }

  private getReferencedShapeTreesListBreadthFirst(): List<ReferencedShapeTree> /* throws URISyntaxException, ShapeTreeException */ {
    const referencedShapeTrees: ReferencedShapeTree[] = new Array();
    const queue: Queue<ReferencedShapeTree> = new LinkedList<>(this.getReferences());

    while (!queue.isEmpty()) {
      const currentShapeTree: ReferencedShapeTree = queue.poll();
      referencedShapeTrees.push(currentShapeTree);
      const shapeTree: ShapeTree = ShapeTreeFactory.getShapeTree(currentShapeTree.getReferencedShapeTreeURI());
      if (shapeTree !== null) {
        const currentReferencedShapeTrees: ReferencedShapeTree[] = shapeTree.getReferences();
        if (currentReferencedShapeTrees != null) {
          queue.addAll(currentReferencedShapeTrees);
        }
      }
    }
    return referencedShapeTrees;
  }

  private getReferencedShapeTreesListDepthFirst(currentReferencedShapeTrees: ReferencedShapeTree[], referencedShapeTrees: ReferencedShapeTree[]): ReferencedShapeTree[] /* throws URISyntaxException, ShapeTreeException */ {
    for (const currentShapeTreeReference of currentReferencedShapeTrees) {
      referencedShapeTrees.push(currentShapeTreeReference);
      const currentReferencedShapeTree: ShapeTree = ShapeTreeFactory.getShapeTree(currentShapeTreeReference.getReferencedShapeTreeURI());
      if (currentReferencedShapeTree != null) {
        // eslint-disable-next-line no-param-reassign
        referencedShapeTrees = this.getReferencedShapeTreesListDepthFirst(currentReferencedShapeTree.getReferences(), referencedShapeTrees);
      }
    }
    return referencedShapeTrees;
  }

  private exceptionMessage(requestedName: string, id: string, customMessage: string): string {
    return 'Failed to match [' + requestedName + '] against any :contents for [' + id + ']. ' + customMessage;
  }
}

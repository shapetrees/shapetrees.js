import { DataFactory, Store, Triple } from 'n3';

import { ShapeTreeVocabulary } from '@vocabs/ShapeTreeVocabulary';
import { IllegalStateException } from '@todo/exceptions';

// @Getter @AllArgsConstructor
export class ShapeTreeLocator {
  constructor(
    private rootShapeTree: string,
    private shapeTree: string,
    private shapeTreeRoot: string
  ) { }

  getRootShapeTree(): string { return this.rootShapeTree; }
  // setRootShapeTree(rootShapeTree: string): void { this.rootShapeTree = rootShapeTree; }
  getShapeTree(): string { return this.shapeTree; }
  // setShapeTree(shapeTree: string): void { this.shapeTree = shapeTree; }
  getShapeTreeRoot(): string { return this.shapeTreeRoot; }
  // setShapeTreeRoot(shapeTreeRoot: string): void { this.shapeTreeRoot = shapeTreeRoot; }

  public static getShapeTreeLocatorsFromGraph(shapeTreeMetadataGraph: Store): ShapeTreeLocator[] {
    const locators: ShapeTreeLocator[] = new Array();

    const hasShapeTreeLocatorTriples: Triple[] = shapeTreeMetadataGraph.getQuads(null, DataFactory.namedNode(ShapeTreeVocabulary.HAS_SHAPE_TREE_LOCATOR), null, null);
    for (let hasShapeTreeLocatorTriple of hasShapeTreeLocatorTriples) {
      const locatorURI: string = hasShapeTreeLocatorTriple.object.value;

      const locatorTriples: Triple[] = shapeTreeMetadataGraph.getQuads(DataFactory.namedNode(locatorURI), null, null, null);
      let shapeTreeRoot: string | null = null;
      let rootShapeTree: string | null = null;
      let shapeTree: string | null = null;
      for (let locatorTriple of locatorTriples) {
        switch (locatorTriple.predicate.value) {
          case ShapeTreeVocabulary.HAS_SHAPE_TREE:
            shapeTree = locatorTriple.object.value;
            break;
          case ShapeTreeVocabulary.HAS_SHAPE_TREE_INSTANCE_ROOT:
            shapeTreeRoot = locatorTriple.object.value;
            break;
          case ShapeTreeVocabulary.HAS_ROOT_SHAPE_TREE:
            rootShapeTree = locatorTriple.object.value;
            break;
          default:
            throw new IllegalStateException("Unexpected value: " + locatorTriple.predicate.value);
        }
      }
      if (rootShapeTree === null || shapeTree === null || shapeTreeRoot === null) {
        throw new IllegalStateException(`ShapeTree ${locatorURI} is incomplete: rootShapeTree: ${rootShapeTree}, shapeTree: ${shapeTree}, shapeTreeRoot: ${shapeTreeRoot}`);
      }
      locators.push(new ShapeTreeLocator(rootShapeTree, shapeTree, shapeTreeRoot));
    }

    return locators;
  }
}

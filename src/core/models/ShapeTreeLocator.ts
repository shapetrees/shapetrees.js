import { DataFactory, Store, Triple } from 'n3';

import { ShapeTreeVocabulary } from '@vocabs/ShapeTreeVocabulary';
import { IllegalStateException } from '@todo/exceptions';

// @Getter @AllArgsConstructor
export class ShapeTreeLocator {
    private rootShapeTree: string;
    private shapeTree: string;
    private shapeTreeRoot: string;

    public static getShapeTreeLocatorsFromGraph(shapeTreeMetadataGraph: Store): ShapeTreeLocator[] {
      const locators = new Array<ShapeTreeLocator>();

      // eslint-disable-next-line max-len
      const hasShapeTreeLocatorTriples = shapeTreeMetadataGraph.getQuads(null, DataFactory.namedNode(ShapeTreeVocabulary.HAS_SHAPE_TREE_LOCATOR), null, null);
      for (const hasShapeTreeLocatorTriple of hasShapeTreeLocatorTriples) {
        const locatorURI: string = hasShapeTreeLocatorTriple.object.value;

        const locatorTriples = shapeTreeMetadataGraph.getQuads(DataFactory.namedNode(locatorURI), null, null, null);
        let shapeTreeRoot: string | undefined;
        let rootShapeTree: string | undefined;
        let shapeTree: string | undefined;
        for (const locatorTriple of locatorTriples) {
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
              throw new IllegalStateException(`Unexpected value: ${locatorTriple.predicate.value}`);
          }
        }
        if (rootShapeTree === undefined || shapeTree === undefined || shapeTreeRoot === undefined) {
          throw new IllegalStateException(`ShapeTree ${locatorURI} is incomplete: rootShapeTree: ${rootShapeTree}, shapeTree: ${shapeTree}, shapeTreeRoot: ${shapeTreeRoot}`);
        }
        locators.push(new ShapeTreeLocator(/* rootShapeTree, shapeTree, shapeTreeRoot */));
      }

      return locators;
    }
}

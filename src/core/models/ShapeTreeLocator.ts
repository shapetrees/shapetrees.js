import { Store, Triple } from 'n3';
import { DataFactory } from 'n3'
import ShapeTreeVocabulary from '../vocabularies/ShapeTreeVocabulary';
import { IllegalStateException } from '../../todo/exceptions';

// @Getter @AllArgsConstructor
export default class ShapeTreeLocator {
    private rootShapeTree: string;
    private shapeTree: string;
    private shapeTreeRoot: string;

    public static getShapeTreeLocatorsFromGraph(shapeTreeMetadataGraph: Store): ShapeTreeLocator[] {
        const locators: ShapeTreeLocator[] = new Array();

        const hasShapeTreeLocatorTriples: Triple[] = shapeTreeMetadataGraph.getQuads(null, DataFactory.namedNode(ShapeTreeVocabulary.HAS_SHAPE_TREE_LOCATOR), null, null);
        for (let hasShapeTreeLocatorTriple of hasShapeTreeLocatorTriples) {
            const locatorURI: string = hasShapeTreeLocatorTriple.object.value;

            const locatorTriples: Triple[] = shapeTreeMetadataGraph.getQuads(DataFactory.namedNode(locatorURI), null, null, null);
            let shapeTreeRoot: string | undefined;
            let rootShapeTree: string | undefined;
            let shapeTree: string | undefined;
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
            if (rootShapeTree === undefined || shapeTree === undefined || shapeTreeRoot === undefined)
                throw new IllegalStateException(`ShapeTree ${locatorURI} is incomplete: rootShapeTree: ${rootShapeTree}, shapeTree: ${shapeTree}, shapeTreeRoot: ${shapeTreeRoot}`);
            debugger;
            locators.push(new ShapeTreeLocator(/*rootShapeTree, shapeTree, shapeTreeRoot*/));
        }

        return locators;
    }
}

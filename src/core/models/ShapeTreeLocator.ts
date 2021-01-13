import { Store, Triple } from 'n3';
import { DataFactory } from 'n3'
import ShapeTreeVocabulary from '../vocabularies/ShapeTreeVocabulary';

// @Getter @AllArgsConstructor
export default class ShapeTreeLocator {
    private rootShapeTree: string;
    private shapeTree: string;
    private shapeTreeRoot: string;

    public static getShapeTreeLocatorsFromGraph(shapeTreeMetadataGraph: Store): ShapeTreeLocator[] {
        const locators: ShapeTreeLocator[] = new Array();

        const hasShapeTreeLocatorTriples: Triple[] = shapeTreeMetadataGraph.getQuads(null, DataFactory.namedNode(ShapeTreeVocabulary.HAS_SHAPE_TREE_LOCATOR), null, null);
        for (let hasShapeTreeLocatorTriple: Triple in hasShapeTreeLocatorTriples) {
            const locatorURI: string = hasShapeTreeLocatorTriple.getObject().getURI();

            const locatorTriples: Triple[] = shapeTreeMetadataGraph.find(DataFactory.namedNode(locatorURI), null, null);
            let shapeTreeRoot: string = null;
            let rootShapeTree: string = null;
            let shapeTree: string = null;
            for (let locatorTriple: Triple in locatorTriples) {
                switch (locatorTriple.getPredicate().getURI()) {
                    case ShapeTreeVocabulary.HAS_SHAPE_TREE:
                        shapeTree = locatorTriple.getObject().getURI();
                        break;
                    case ShapeTreeVocabulary.HAS_SHAPE_TREE_INSTANCE_ROOT:
                        shapeTreeRoot = locatorTriple.getObject().getURI();
                        break;
                    case ShapeTreeVocabulary.HAS_ROOT_SHAPE_TREE:
                        rootShapeTree = locatorTriple.getObject().getURI();
                        break;
                    default:
                        throw new IllegalStateException("Unexpected value: " + locatorTriple.getPredicate().getURI());
                }
            }
            locators.add(new ShapeTreeLocator(rootShapeTree, shapeTree, shapeTreeRoot));
        }

        return locators;
    }
}

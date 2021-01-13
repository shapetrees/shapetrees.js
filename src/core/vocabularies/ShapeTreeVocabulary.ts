import Namespaces from "./Namespaces";

export default class ShapeTreeVocabulary {
    public static HAS_ROOT_SHAPE_TREE: string = Namespaces.SHAPETREE + "hasRootShapeTree";
    public static HAS_SHAPE_TREE_INSTANCE_ROOT: string = Namespaces.SHAPETREE + "hasShapeTreeInstanceRoot";
    public static HAS_SHAPE_TREE: string = Namespaces.SHAPETREE + "hasShapeTree";
    public static HAS_SHAPE_TREE_LOCATOR: string = Namespaces.SHAPETREE + "hasShapeTreeLocator";
    public static EXPECTS_TYPE: string = Namespaces.SHAPETREE + "expectsType";
    public static REFERENCES: string = Namespaces.SHAPETREE + "references";
    public static CONTAINS: string = Namespaces.SHAPETREE + "contains";
    public static TRAVERSE_VIA_SHAPE_PATH: string = Namespaces.SHAPETREE + "traverseViaShapePath";
    public static VALIDATED_BY: string = Namespaces.SHAPETREE + "validatedBy";
    public static SUPPORTS: string = Namespaces.SHAPETREE + "supports";
    public static ALLOW_RESOURCES: string = Namespaces.SHAPETREE + "AllowResources";
    public static ALLOW_CONTAINERS: string = Namespaces.SHAPETREE + "AllowContainers";
    public static ALLOW_NON_RDF_SOURCES: string = Namespaces.SHAPETREE + "AllowNonRDFSources";
    public static ALLOW_ALL: string = Namespaces.SHAPETREE + "AllowAll";
    public static ALLOW_NONE: string = Namespaces.SHAPETREE + "AllowNone";
    public static SHAPETREE_CONTAINER: string = Namespaces.SHAPETREE + "ShapeTreeContainer";
    public static SHAPETREE_RESOURCE: string = Namespaces.SHAPETREE + "ShapeTreeResource";
    public static HAS_SHAPETREE_DECORATOR_INDEX: string = Namespaces.SHAPETREE + "hasShapeTreeDecoratorIndex";
    public static SHAPETREE_DECORATOR_INDEX: string = Namespaces.SHAPETREE + "ShapeTreeDecoratorIndex";
    public static DEFAULT_LANGUAGE: string = Namespaces.SHAPETREE + "defaultLanguage";
    public static HAS_SERIES: string = Namespaces.SHAPETREE + "hasSeries";
    public static SHAPETREE_DECORATOR_SERIES: string = Namespaces.SHAPETREE + "ShapeTreeDecoratorSeries";
    public static USES_LANGUAGE: string = Namespaces.SHAPETREE + "usesLanguage";
    public static HAS_VERSION: string = Namespaces.SHAPETREE + "hasVersion";
    public static SHAPETREE_DECORATOR_VERSION: string = Namespaces.SHAPETREE + "ShapeTreeDecoratorVersion";
    public static HAS_SHAPETREE_DECORATOR_RESOURCE: string = Namespaces.SHAPETREE + "hasShapeTreeDecoratorResource";
    public static IS_VERSION: string = Namespaces.SHAPETREE + "isVersion";
    public static HAS_SHA256: string = Namespaces.SHAPETREE + "hasSHA256";
    public static SHAPETREE_DECORATOR: string = Namespaces.SHAPETREE + "ShapeTreeDecorator";
}

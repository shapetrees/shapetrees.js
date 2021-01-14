enum HttpHeaders {
    ACCEPT = "Accept",
    AUTHORIZATION = "Authorization",
    CONTENT_TYPE = "Content-Type",
    LINK = "Link",
    LOCATION = "Location",
    SLUG = "Slug",
    INTEROP_ORIGINATOR = "InteropOrigin",
    INTEROP_WEBID = "InteropWebID"
}

enum LinkRelations {
    DESCRIBED_BY = "describedby",
    FOCUS_NODE = "http://shapetrees.org/#FocusNode",
    SHAPETREE = "http://shapetrees.org/#ShapeTree",
    TARGET_SHAPETREE = "http://shapetrees.org/#TargetShapeTree",
    TYPE = "type",
    ACL = "acl"
}

enum RecursionMethods {
    DEPTH_FIRST,
    BREADTH_FIRST
}

enum ShapeTreeResourceType {
    RESOURCE,
    CONTAINER,
    NON_RDF
}

export {
    HttpHeaders,
    LinkRelations,
    RecursionMethods,
    ShapeTreeResourceType
}

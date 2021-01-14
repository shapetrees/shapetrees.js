# shapetrees.js
Javascript (typescript) implementation of ShapeTrees

## hacks

* see src/todo/*

* move typing to end of function decl:
```
default \(public\) +\([^ ]+\) +\([a-zA-Z0-9_]+\)(\([^)]*\)) → \1 \3(\4): \2
```
* s/Graph/Store/ imported from n3 (would rather rdfjs interface)

* no Graph.close()

* String -> string

* Boolean -> boolean

* Boolean.FALSE.equals(x) -> !x

* replaced riot's multi-lingual parser with n3's Turtle parser

* com/janeirodigital/shapetrees/core/enums/HttpHeaders.java -> enum

* mapped ConcurrentHashMap to Map

* used string concatonation for StringBuilder

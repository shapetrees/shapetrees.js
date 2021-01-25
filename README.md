# shapetrees.js
Javascript (typescript) implementation of ShapeTrees

## hacks

* see src/todo/*

* loglevel probably doesn't support `"Failed to {} from {}", p1, p2` invocation

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

* changed OkHttp's MediaType to string

* commented out {Request,FetchHttpClient}.Builder types like `foo: Request.Builder`

* `Objects.requireNonNull(x)` mapped to `if (x === null) throw new NullPointerException("x");`

* TS question: can foo be `undefined` in `class X { foo: string | null; }`?
  * matters for e.g. ShapeTreeResponse

* mapped classes like LdpVocabulary to enums

* merged contents of `exceptions` and `vocabularies` to single files.

* @getter/@setter directives should be checked for simple public data interface.

* \[java and ts] should we name a type for `Map<string, string[]>`, or should we reuse Headers from some HTTP API?

* wrap headers to change `| undefined`s to `| null`

* converted `for(Foo foo: fooz)` to `for(const foo of fooz` (elides type)

* didn't handle `headers.get(LinkRelations.SHAPETREE).stream().findFirst().orElse(null)` consistently

* s/model/graph/g

* guessing that @Getter emits e.g. `isRequestFulfilled(): boolean` for booleans. true?

* I wasn't disciplined about considering repsonse codes on this idiom: ```typescript
 ||
      (() => { throw new ShapeTreeException(422, "No metadata graph for " + parentContainer.getUri()) })()
```

* gave these distinct names:
```typescript
  protected plantShapeTreeStore(shapeTreeContext: ShapeTreeContext, parentContainer: ShapeTreeResource, bodyGraph: Store ,                        rootShapeTree: ShapeTree       , rootContainer  : string,       shapeTree: ShapeTree, requestedName: string): ShapeTreePlantResult /* throws IOException, URISyntaxException * /
  protected plantShapeTreeLocator(shapeTreeContext: ShapeTreeContext, parentContainer: ShapeTreeResource, body     : string, contentType  : string, locator      : ShapeTreeLocator                         , targetShapeTree: ShapeTree, requestedName: string): ShapeTreePlantResult /* throws IOException, URISyntaxException * /
  protected plantShapeTree(shapeTreeContext: ShapeTreeContext, parentContainer: ShapeTreeResource, body     : string, contentType  : string, rootShapeTree: ShapeTree       , rootContainer  : string,       shapeTree: ShapeTree, requestedName: string): ShapeTreePlantResult /* throws IOException, URISyntaxException * /
```

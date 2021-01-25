import { BlankNode, DataFactory, Literal, NamedNode, Quad, Store, Variable } from "n3";

export function expectType<T>(x: NamedNode | Literal | BlankNode | Variable): T {
  // @@ if (x instanceof T)
  return <T><any>x;
  // else throw TypeError(`${x} not of type ${T}`);
}

export function expectOneObject<T>(graph: Store, s: NamedNode | BlankNode, p: NamedNode, fail: () => T): T {
  const matches: Quad[] = graph.getQuads(s, p, null, null);
  if (matches.length !== 1)
    return fail();
  const ret = matches[0].object;
  // @@ if (ret instanceof T)
  return <T><any>ret;
  // else throw TypeError(`${x} not of type ${T}`);
}

export function expectTypes<T>(graph: Store, s: NamedNode | BlankNode, p: NamedNode, fail: (term: NamedNode | Literal | BlankNode | Variable) => T): T[] {
  const matches: Quad[] = graph.getQuads(s, p, null, null);
  return matches.map(q => {
    // @@ if (ret instanceof T)
    return <T><any>q.object;
    // else fail(q.object);
  });
}


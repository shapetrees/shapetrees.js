import {
  BlankNode, DataFactory, Literal, NamedNode, Quad, Store, Variable,
} from 'n3';

const DEFAULT_QUADS_CUTOFF = 10;

export function expectType<T>(x: NamedNode | Literal | BlankNode | Variable): T {
  // @@ if (x instanceof T)
  return <T><any>x;
  // else throw TypeError(`${x} not of type ${T}`);
}

export function expectOneObject<T>(graph: Store, s: NamedNode | BlankNode, p: NamedNode, fail: (g: Store) => T): T {
  const matches: Quad[] = graph.getQuads(s, p, null, null);
  if (matches.length !== 1) {
    return fail(graph);
  }
  const ret = matches[0].object;
  // @@ if (ret instanceof T)
  return <T><any>ret;
  // else throw TypeError(`${x} not of type ${T}`);
}

export function expectTypes<T>(graph: Store, s: NamedNode | BlankNode, p: NamedNode, fail: (term: NamedNode | Literal | BlankNode | Variable) => T): T[] {
  const matches: Quad[] = graph.getQuads(s, p, null, null);
  // eslint-disable-next-line arrow-body-style
  return matches.map((q) => {
    // @@ if (ret instanceof T)
    return <T><any>q.object;
    // else fail(q.object);
  });
}

export type PrefixMap = { [key: string]: string; };

export const DefaultPrefixes: PrefixMap = {
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  st: 'http://www.w3.org/ns/shapetree#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
};

export function dumpQuads<T>(graph: Store | Quad[] | [Store, NamedNode | Literal | BlankNode], prefixes: PrefixMap = DefaultPrefixes, cutoff: number = DEFAULT_QUADS_CUTOFF): string {

  // https://www.w3.org/TR/turtle/#grammar-production-ECHAR
  const QuoteEscapes = {
    '\t': '\\t',
    '\b': '\\b',
    '\n': '\\n',
    '\r': '\\r',
    '\f': '\\f',
    '"': '\\"',
    '\'': '\\\'',
    '\\': '\\\\',
  };

  // https://www.w3.org/TR/turtle/#grammar-production-PN_LOCAL_ESC
  const IriEscapes = '_~.-!$&\'()*+,;=/?#@%'.split('').reduce((acc: PrefixMap, ch) => {
    acc[ch] = '\\' + ch;
    return acc;
  }, {});

  const quads: Quad[] = Array.isArray(graph) && graph[0] instanceof Store
    ? graph[0].getQuads(graph[1], null, null, null)
    : graph instanceof Store
      ? graph.getQuads(null, null, null, null)
      : graph as Quad[];
  const trailer = quads.length > cutoff
    ? '\n... plus ' + (quads.length - cutoff) + ' more'
    : '';
  return quads.length + ' quads:\n' + (quads.slice(0, cutoff).map(summarize).join('\n')) + trailer;

  function summarize(quad: Quad): string {
    return `${term(quad.subject)} ${term(quad.predicate)} ${term(quad.object)} .`;
  }

  function term(term: BlankNode | Literal | NamedNode | Variable): string {
    const s: string = term.value;
    return term instanceof BlankNode
      ? ('_:' + s)
      : term instanceof Literal
        ? turtleLiteral(term)
        : shorten(s);
  }
  function turtleLiteral(literal: Literal): string {
    const valueStr = myEscape(literal.value, QuoteEscapes);
    const langStr = literal.language
      ? '@' + literal.language
      : '';
    const datatypeStr = literal.datatype && literal.datatype.value !== DefaultPrefixes.xsd + 'string'
      ? '^^' + shorten(literal.datatype.value)
      : '';
    return '"' + valueStr + '"' + langStr + datatypeStr;
  }

  function shorten(iri: string): string {
    const sorted = Object.entries(prefixes).filter((pair) => iri.startsWith(pair[1])).sort((l, r) => r[1].length - l[1].length);
    return sorted.length
      ? sorted[0][0] + ':' + myEscape(iri.substr(sorted[0][1].length), IriEscapes)
      : '<' + iri + '>';
  }

  function myEscape(v: string, escaped: PrefixMap): string {
    return v.split('').reduce((acc, ch) => acc + (
      (ch in escaped)
        ? escaped[ch]
        : ch
    ), '');
  }
}

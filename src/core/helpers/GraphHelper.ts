import { Parser, Store, Writer } from 'n3';
import { URL } from 'url';
import { ShapeTreeException } from '@core/exceptions';
import { Lang } from '@todo/Lang';

/**
 * Assorted helper methods related to RDF Graphs
 */
export class GraphHelper {
  /**
     * Determine the Jena language (graph serialization type) based on a content type string
     * @param contentType Content type string
     * @return Serialization language
     */
  public static getLangForContentType(contentType: string): Lang {
    if (contentType == null) {
      return Lang.TURTLE;
    }
    switch (contentType) {
      case 'application/ld+json':
        return Lang.JSONLD;
      case 'application/rdf+xml':
        return Lang.RDFXML;
      case 'application/n-triples':
        return Lang.NTRIPLES;
      default:
        return Lang.TURTLE;
    }
  }

  /**
     * Writes a graph into a turtle serialization
     * @param graph Graph to serialize
     * @return string in TTL serialization
     */
  public static writeGraphToTurtleString(graph: Store | null): string | null {
    if (graph == null) return null;
    // if (graph.isClosed()) return null;

    const writer = new Writer();
    writer.addQuads(graph.getQuads(null, null, null, null));
    let ret: string | null = null;
    writer.end((err, result) => {
      if (err) throw Error(`failed to write graph with ${graph.size} quads`);
      else ret = result;
    });
    // graph.close();
    return ret;
  }

  /**
     * Deserializes a string into a Model
     * @param baseURI Base URI to use for statements
     * @param rawContent string of RDF
     * @param contentType Content type of content
     * @return Deserialized model
     * @throws ShapeTreeException ShapeTreeException
     */
  /* throws ShapeTreeException */
  public static readStringIntoGraph(baseURI: URL, rawContent: string, contentType: string): Store {
    try {
      const ret = new Store();
      if (contentType === 'text/turtle') {
        const p = new Parser({ baseIRI: baseURI.href });
        ret.addQuads(p.parse(rawContent/*, (error, quad, prefixes) => {
          if (error) throw error;
          if (quad) ret.addQuad(quad);
        }*/));
      } else {
        throw Error(`unsupported content type: ${rawContent}`);
      }
      return ret;
    } catch (ex) {
      throw new ShapeTreeException(422, `Error processing input - ${ex.getMessage()}`);
    }
  }
}

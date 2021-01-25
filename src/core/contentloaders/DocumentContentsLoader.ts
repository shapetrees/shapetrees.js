import { DocumentContents } from "@core/models/DocumentContents";
import { URL } from "url";

/**
 * Interface defining how a remote document can be loaded and its contents extracted.
 * Implementations can add capabilities like caching, retrieving resources from alternate
 * locations, etc.
 */
export interface DocumentContentsLoader {
  /**
   * Describes the retrieval of a remote document
   * @param resourceURI URI of resource to be retrieved
   * @return DocumentContents representation which contains body and content type
   * @throws ShapeTreeException ShapeTreeException
   */
  loadDocumentContents(resourceURI: URL): Promise<DocumentContents> /* throws ShapeTreeException */;
}

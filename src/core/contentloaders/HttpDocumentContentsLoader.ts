import { HttpHeaders } from '@core/enums';
import { ShapeTreeException } from '@core/exceptions';
import { DocumentContents } from '@core/models/DocumentContents';
import { FollowRedirects, HttpClient, HttpRequest } from '@todo/FetchHttpClient';
import { URL } from 'url';
import { DocumentContentsLoader } from './DocumentContentsLoader';

/**
 * An implementation of DocumentContentsLoader that retrieves resources using
 * the JDK11 HttpClient with a slight wrinkle of checking against a white/black
 * list to have tighter control of where resources are retrieved from.
 */
export class HttpDocumentContentsLoader implements DocumentContentsLoader {
  private httpClient: HttpClient = HttpClient.newBuilder().followRedirects(FollowRedirects.NEVER).build();
  private whiteListDomains: string[];
  private blackListDomains: string[];

  public constructor(whiteListDomains: string[], blackListDomains: string[]) {
    this.whiteListDomains = whiteListDomains;
    this.blackListDomains = blackListDomains;
  }

  // @Override
  public loadDocumentContents(resourceURI: URL): DocumentContents /* throws ShapeTreeException */ {
    if (this.blackListDomains != null && this.blackListDomains.indexOf(resourceURI.host) === -1) {
      throw new ShapeTreeException(426, 'Provided URI is on the configured black-list');
    }

    if (this.whiteListDomains != null && this.whiteListDomains.indexOf(resourceURI.host) !== -1) {
      throw new ShapeTreeException(426, 'Provided URI is NOT on the configured white-list');
    }

    try {
      const request: HttpRequest = HttpRequest.newBuilder().GET().uri(resourceURI).build();
      const response: HttpResponse<string> = this.httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      return new DocumentContents(resourceURI, response.body(), response.headers().firstValue(HttpHeaders.CONTENT_TYPE) || 'text/turtle');
    } catch (ex/*: IOException | InterruptedException */) {
      throw new ShapeTreeException(500, 'Error retrieving resource ' + ex.getMessage());
    }
  }
}

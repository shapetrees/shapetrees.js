import { HttpHeaders } from '@core/enums';
import { ShapeTreeException } from '@core/exceptions';
import { DocumentContents } from '@core/models/DocumentContents';
import {
  FetchHttpClient, FollowRedirects, HttpClient, HttpRequest, HttpRequestMethod, Request, Response,
} from '@todo/FetchHttpClient';
import { URL } from 'url';
import { DocumentContentsLoader } from './DocumentContentsLoader';

/**
 * An implementation of DocumentContentsLoader that retrieves resources using
 * the JDK11 HttpClient with a slight wrinkle of checking against a white/black
 * list to have tighter control of where resources are retrieved from.
 */
export class HttpDocumentContentsLoader implements DocumentContentsLoader {
  private httpClient: HttpClient = HttpClient.newBuilder().followRedirects(FollowRedirects.NEVER).build();
  private whiteListDomains: string[] | null;
  private blackListDomains: string[] | null;

  public constructor(whiteListDomains: string[] | null, blackListDomains: string[] | null) {
    this.whiteListDomains = whiteListDomains;
    this.blackListDomains = blackListDomains;
  }

  // @Override
  public async loadDocumentContents(resourceURI: URL): Promise<DocumentContents> /* throws ShapeTreeException */ {
    if (this.blackListDomains != null && this.blackListDomains.indexOf(resourceURI.host) === -1) {
      throw new ShapeTreeException(426, 'Provided URI is on the configured black-list');
    }

    if (this.whiteListDomains != null && this.whiteListDomains.indexOf(resourceURI.host) !== -1) {
      throw new ShapeTreeException(426, 'Provided URI is NOT on the configured white-list');
    }

    try {
      // const request: HttpRequest = HttpRequest.newBuilder().GET().uri(resourceURI).build();
      // const response: HttpResponse<string> = this.httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      const request: Request = new Request(HttpRequestMethod.GET, resourceURI, new Map(), null);
      const response: Response = await (new FetchHttpClient().newCall(request).execute());
      const body = response.body();
      const ct = response.headers().get(HttpHeaders.CONTENT_TYPE);
      return new DocumentContents(resourceURI, body ? body.string() : '', ct ? ct[0] : 'text/turtle');
    } catch (ex/*: IOException | InterruptedException */) {
      throw new ShapeTreeException(500, 'Error retrieving resource ' + ex.getMessage());
    }
  }
}

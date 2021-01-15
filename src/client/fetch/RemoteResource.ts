/**
 * Convenience class that encapsulates an OkHttp-based http client to quickly retrieve
 * web resources with convenient methods to access headers, link headers and the body as a graph
 */

import { Store } from 'n3';
import { URL } from 'url';
import log from 'loglevel';
import { GraphHelper } from '@helpers/GraphHelper';
import { HttpHeaders, LinkRelations } from '@core/enums';
import { ShapeTreeException } from '@core/exceptions';
import {
  FetchHttpClient, Request, RequestBody, Response, ResponseBody,
} from '@todo/FetchHttpClient';
import { IOException } from '@todo/exceptions';
import { HttpHeaderHelper } from '@helpers/HttpHeaderHelper';
import { ShapeTreeHttpClientHolder } from './ShapeTreeHttpClientHolder';
import { ShapeTreeClientConfiguration } from './ShapeTreeClientConfiguration';

// @Slf4j
export class RemoteResource {
    private uri: URL;
    private authorizationHeaderValue: string;
    private invalidated = false;
    private _exists: boolean;
    private responseHeaders: Map<string, string[]>;
    private parsedLinkHeaders: Map<string, string[]>;
    private parsedGraph: Store;
    private rawBody: string;
    private clientConfiguration = new ShapeTreeClientConfiguration(false, false);

    public constructor(uriString: string | URL, authorizationHeaderValue: string) /* throws IOException */ {
      if (uriString instanceof URL) {
        this.uri = uriString;
      } else {
        let requestUri: URL;
        try {
          requestUri = new URL(uriString);
        } catch (ex /* TypeError */) {
          throw new IOException('Request URI is not a value URI');
        }
        this.uri = requestUri;
      }
      this.authorizationHeaderValue = authorizationHeaderValue;
      this.dereferenceURI();
    }

    public getUri(): URL /* throws IOException */ {
      if (this.invalidated) {
        this.dereferenceURI();
      }
      return this.uri;
    }

    public exists(): boolean {
      return this._exists;
    }

    public getBody(): string | null /* throws IOException */ {
      if (!this._exists) return null;

      if (this.invalidated) {
        log.debug('RemoteResource#getBody({}) - Resource Invalidated - Refreshing', this.uri);
        this.dereferenceURI();
      }

      return this.rawBody;
    }

    // Lazy-load graph when requested
    public getGraph(baseURI: URL): Store | null /* throws IOException */ {
      if (!this._exists) return null;

      if (this.invalidated) {
        log.debug('RemoteResource#getGraph({}) - Resource Invalidated - Refreshing', this.uri);
        this.dereferenceURI();
      }

      if (this.parsedGraph == null) {
        this.parsedGraph = GraphHelper.readStringIntoGraph(baseURI, this.rawBody, this.getFirstHeaderByName(HttpHeaders.CONTENT_TYPE) || 'text/turtle');
      }
      return this.parsedGraph;
    }

    public isContainer(): boolean {
      let uriPath: string = this.uri.href;
      uriPath = uriPath.substring(0, uriPath.length - this.uri.hash.length);

      return uriPath.endsWith('/');
    }

    public getResponseHeaders(): Map<string, string[]> { return this.responseHeaders; }

    public getLinkHeaders(): Map<string, string[]> {
      return this.parsedLinkHeaders;
    }

    public getFirstHeaderByName(headerName: string): string | null /* throws IOException */ {
      if (this.invalidated) {
        log.debug('RemoteResource#getFirstHeaderByName({}) - Resource Invalidated - Refreshing', this.uri);
        this.dereferenceURI();
      }

      const headerValues: string[] | undefined = this.responseHeaders.get(headerName);
      if (headerValues === undefined) {
        return null;
      }

      return headerValues[0];
    }

    public updateGraph(updatedGraph: Store, refreshResourceAfterUpdate: string, authorizationHeaderValue: string): void /* throws IOException */ {
      log.debug('RemoteResource#updateGraph({})', this.uri);

      if (this.invalidated) {
        throw new ShapeTreeException(500, "Cannot call 'updateGraph' on an invalidated RemoteResource - ");
      }

      const body: string | null = GraphHelper.writeGraphToTurtleString(updatedGraph);
      if (body === null) throw new ShapeTreeException(500, "'updateGraph' cannot serialize update graph - ");

      const httpClient: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(this.clientConfiguration);
      const requestBuilder/*: Request.Builder */ = new Request.Builder()
        .url(this.uri.href)
        .addHeader(HttpHeaders.CONTENT_TYPE, 'text/turtle')
        .put(RequestBody.create(body, 'text/turtle'));

      if (authorizationHeaderValue != null) {
        requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, authorizationHeaderValue);
      }

      httpClient.newCall(requestBuilder.build()).execute();

      if (refreshResourceAfterUpdate) {
        this.dereferenceURI();
      } else {
        this.invalidated = true;
        log.debug('RemoteResource#updateGraph({}) - Invalidating Resource', this.uri);
      }
    }

    public getMetadataResource(authorizationHeaderValue: string): RemoteResource /* throws IOException */ {
      return new RemoteResource(this.getMetadataURI(), authorizationHeaderValue);
    }

    // @NotNull
    public getMetadataURI(): string /* throws IOException */ {
      if (!this.parsedLinkHeaders.has(LinkRelations.SHAPETREE)) {
        log.error('The resource {} does not contain a link header of {}', this.getUri(), LinkRelations.SHAPETREE);
        throw new ShapeTreeException(500, `No Link header with relation of ${LinkRelations.SHAPETREE} found`);
      }
      let metaDataURIString: string | null = this.parsedLinkHeaders.get(LinkRelations.SHAPETREE)!![0] || null;
      if (metaDataURIString != null && metaDataURIString.startsWith('/')) {
        // If the header value doesn't include scheme/host, prefix it with the scheme & host from container
        const shapeTreeContainerURI: URL = this.getUri();
        let portFragment: string;
        if (parseInt(shapeTreeContainerURI.port, 10) > 0) {
          portFragment = `:${shapeTreeContainerURI.port}`;
        } else {
          portFragment = '';
        }
        metaDataURIString = `${shapeTreeContainerURI.protocol}://${shapeTreeContainerURI.host}${portFragment}${metaDataURIString}`;
      }

      if (metaDataURIString == null) {
        throw new ShapeTreeException(500, `No Link header with relation of ${LinkRelations.SHAPETREE} found`);
      }

      return metaDataURIString;
    }

    private dereferenceURI(): void /* throws IOException */ {
      log.debug('RemoteResource#dereferencingURI({})', this.uri);

      const httpClient: FetchHttpClient = ShapeTreeHttpClientHolder.getForConfig(this.clientConfiguration);
      const requestBuilder /*: Request.Builder */ = new Request.Builder()
        .url(this.uri.href);

      if (this.authorizationHeaderValue != null) {
        requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, this.authorizationHeaderValue);
      }

      const request /*: Request */ = requestBuilder.build();

      try {
        const response: Response = httpClient.newCall(request).execute();
        this.parseResponseToRemoteResource(response);
        this.invalidated = false;
      } catch (e /* Exception */) {
        log.error('Error dereferencing URI', e);
      }
    }

    private parseResponseToRemoteResource(response: Response): void /* throws IOException */ {
      this._exists = response.code() < 400;

      // Parse the headers for ease of use later
      this.responseHeaders = response.headers();

      // We especially care about Link headers which require extra parsing of the rel values
      if (this.responseHeaders.get(HttpHeaders.LINK) != null) {
        this.parsedLinkHeaders = HttpHeaderHelper.parseLinkHeadersToMap(response.headers().get(HttpHeaders.LINK));
      } else {
        this.parsedLinkHeaders = new Map();
      }

      // Save raw body
      try {
        const body: ResponseBody | null = response.body();
        if (body != null) {
          this.rawBody = body.string();
        }
        // eslint-disable-next-line no-empty
      } catch (e) {

      }
    }
}

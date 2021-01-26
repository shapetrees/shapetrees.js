import { HttpHeaders } from '@core/enums';
import { ShapeTreeException } from '@core/exceptions';
import { ShapeTreeContext } from '@core/models/ShapeTreeContext';
import { ResourceAccessor } from '@core/ResourceAccessor';
import { ShapeTreeResource } from '@core/ShapeTreeResource';
import { FetchClient, RequestBody, RequestBuilder, MediaType, Response } from '@todo/FetchHttpClient';
import log from 'loglevel';
import { URL } from 'url';
import { FetchHelper } from './FetchHelper';
import { RemoteResource } from './RemoteResource';
import { ShapeTreeClientConfiguration } from './ShapeTreeClientConfiguration';
import { ShapeTreeHttpClientHolder } from './ShapeTreeHttpClientHolder';

// @Slf4j
export class FetchRemoteResourceAccessor implements ResourceAccessor {

  // @Override
  public async getResource(context: ShapeTreeContext, resourceURI: URL): Promise<ShapeTreeResource> /* throws ShapeTreeException */ {
    try {
      const remoteResource: RemoteResource = new RemoteResource(resourceURI, context.getAuthorizationHeaderValue());
      await remoteResource.ready;
      return this.mapRemoteResourceToShapeTreeResource(remoteResource);
    } catch (ex/*: Exception*/) {
      throw new ShapeTreeException(500, ex.message);
    }
  }

  // @Override
  public async createResource(context: ShapeTreeContext, resourceURI: URL, headers: Map<string, string[]>, body: string, contentType: string): Promise<ShapeTreeResource> /* throws ShapeTreeException */ {
    log.debug("createResource: URI [{}], headers [{}]", resourceURI, this.writeHeaders(headers));

    try {
      if (body == null) {
        body = "";
      }

      const httpClient: FetchClient = ShapeTreeHttpClientHolder.getForConfig(new ShapeTreeClientConfiguration(false, false));
      const createResourcePostBuilder: RequestBuilder = new RequestBuilder();

      createResourcePostBuilder.headers(FetchHelper.convertHeaders(headers))
        .post(RequestBody.create(body, MediaType.get(contentType)))
        .url(resourceURI);

      if (context.getAuthorizationHeaderValue() !== null) {
        createResourcePostBuilder.addHeader(HttpHeaders.AUTHORIZATION, context.getAuthorizationHeaderValue()!!);
      }

      const response: Response = await httpClient.newCall(createResourcePostBuilder.build()).execute();
      return FetchHelper.mapFetchResponseToShapeTreeResource(response, resourceURI, headers);
    } catch (ex/*: IOException */) {
      throw new ShapeTreeException(500, ex.getMessage());
    }
  }

  // @Override
  public async updateResource(context: ShapeTreeContext, updatedResource: ShapeTreeResource): Promise<ShapeTreeResource> /* throws ShapeTreeException */ {
    log.debug("updateResource: URI [{}]", updatedResource.getUri());

    try {
      const contentType: string | null = updatedResource.getFirstAttributeValue(HttpHeaders.CONTENT_TYPE);

      const httpClient: FetchClient = ShapeTreeHttpClientHolder.getForConfig(new ShapeTreeClientConfiguration(false, false));
      const updateResourcePutBuilder: RequestBuilder = new RequestBuilder();

      updateResourcePutBuilder.headers(FetchHelper.convertHeaders(updatedResource.getAttributes()))
        .put(RequestBody.create(updatedResource.getBody(), MediaType.get(contentType || 'text/turtle'))) // @@
        .url(updatedResource.getUri());

      if (context.getAuthorizationHeaderValue() !== null) {
        updateResourcePutBuilder.addHeader(HttpHeaders.AUTHORIZATION, context.getAuthorizationHeaderValue()!!);
      }

      const response: Response = await httpClient.newCall(updateResourcePutBuilder.build()).execute();
      if (!response.isSuccessful()) {
        log.error("Error updating resource {}, Status {} Message {}", updatedResource, response.code(), response.message());
      }

      // Re-pull the resource after the update
      return this.getResource(context, updatedResource.getUri());
    } catch (ex/*: IOException*/) {
      throw new ShapeTreeException(500, ex.message);
    }

  }

  private writeHeaders(headers: Map<string, string[]>): string {
    let sb = '';
    for (const entry in headers.entries) {
      const [key, values] = entry;
      for (const value of values) {
        if (sb.length !== 0) {
          sb += ",";
        }
        sb += key + '=' + value;
      }
    }

    return sb;
  }

  private mapRemoteResourceToShapeTreeResource(remoteResource: RemoteResource): ShapeTreeResource /* throws ShapeTreeException */ {
    const shapeTreeResource: ShapeTreeResource = new ShapeTreeResource();
    try {
      shapeTreeResource.setUri(remoteResource.getUri());
    } catch (ex/*: IOException */) {
      throw new ShapeTreeException(500, "Error resolving URI");
    }

    shapeTreeResource.setExists(remoteResource.exists());
    shapeTreeResource.setContainer(remoteResource.isContainer());
    try {
      shapeTreeResource.setBody(remoteResource.getBody());
    } catch (iex/*: IOException*/) {
      shapeTreeResource.setBody(null);
    }
    shapeTreeResource.setAttributes(remoteResource.getResponseHeaders());
    return shapeTreeResource;
  }
}

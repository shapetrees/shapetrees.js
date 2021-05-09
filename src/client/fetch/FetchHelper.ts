import { URL } from 'url';
import log from 'loglevel';
import { ShapeTreeResource } from '@core/ShapeTreeResource';
import { Response, ResponseBody } from '@todo/FetchHttpClient';
import { NullPointerException } from '@todo/exceptions';
import { HttpHeaders, LinkRelations } from '@core/enums';
import { ShapeTreeResponse } from '@core/ShapeTreeResponse';
import { HttpHeaderHelper } from '@helpers/HttpHeaderHelper';
import { LdpVocabulary } from '@core/vocabularies';

// @Slf4j
export class FetchHelper {
  /**
     * Converts "multi map" representation of headers to the Fetch Headers class
     * @param headers Multi-map representation of headers
     * @return Fetch Headers object
     */
  public static convertHeaders(headers: Map<string, string[]>): Map<string, string[]> {
    return headers;
  }

  /**
     * Maps an Fetch Response object to a ShapeTreeResource object
     * @param response Fetch Response object
     * @param requestURI URI of request associated with response
     * @param requestHeaders Request headers used in request associated with response
     * @return ShapeTreeResource instance with contents and response headers from response
     */
  public static mapFetchResponseToShapeTreeResource(response: Response, requestURI: URL, requestHeaders: Map<string, string[]>): ShapeTreeResource {
    const location: string | null = response.header(HttpHeaders.LOCATION, requestURI.href);
    if (location === null) throw new NullPointerException('response location');
    const shapeTreeResource: ShapeTreeResource = new ShapeTreeResource(
      new URL(location!!),
      response.isSuccessful(),
      FetchHelper.isContainerFromHeaders(requestHeaders),
      response.headers(),
    );

    try {
      const body = response.body();
      if (body === null) throw new NullPointerException('response body');
      shapeTreeResource.setBody(body.string());
    } catch (ex /* IOException | NullPointerException */) {
      log.error('Exception retrieving body string');
      shapeTreeResource.setBody(null);
    }

    return shapeTreeResource;
  }

  /**
     * Maps an Fetch Response object to a ShapeTreeResponse object
     * @param response Fetch Response object
     * @return ShapeTreeResponse with values from Fetch response
     */
  public static mapFetchResponseToShapeTreeResponse(response: Response): ShapeTreeResponse {
    const shapeTreeResponse: ShapeTreeResponse = new ShapeTreeResponse(response.code(), response.body().string());
    if (response.body().string() === '') {
      log.error('Exception retrieving body string'); // !! needed? useful?
    }
    shapeTreeResponse.setHeaders(response.headers());
    return shapeTreeResponse;
  }

  private static isContainerFromHeaders(requestHeaders: Map<string, string[]>): boolean {
    const parsedLinkHeaders: Map<string, string[]> = HttpHeaderHelper.parseLinkHeadersToMap(requestHeaders.get(HttpHeaders.LINK));

    if (parsedLinkHeaders.get(LinkRelations.TYPE) != null) {
      return parsedLinkHeaders.get(LinkRelations.TYPE)!!.find((v) => v === `${LdpVocabulary.CONTAINER}`) !== undefined
                || parsedLinkHeaders.get(LinkRelations.TYPE)!!.find((v) => v === `${LdpVocabulary.BASIC_CONTAINER}`) !== undefined;
    }
    return false;
  }
}

import ShapeTreeResource from "src/core/ShapeTreeResource";
import { Response, ResponseBody } from "src/todo/FetchHttpClient";
import { URL } from "url";
import { NullPointerException } from "../../todo/exceptions";
import log from 'loglevel';
import { HttpHeaders, LinkRelations } from "src/core/enums";
import ShapeTreeResponse from "src/core/ShapeTreeResponse";
import HttpHeaderHelper from "src/core/helpers/HttpHeaderHelper";
import { LdpVocabulary } from "src/core/vocabularies";

// @Slf4j
export default class FetchHelper {

    /**
     * Converts "multi map" representation of headers to the Fetch Headers class
     * @param headers Multi-map representation of headers
     * @return Fetch Headers object
     */
    public static convertHeaders(headers: Map<String, string[]>): Map<String, string[]> {
        return headers;
    }

    /**
     * Maps an Fetch Response object to a ShapeTreeResource object
     * @param response Fetch Response object
     * @param requestURI URI of request associated with response
     * @param requestHeaders Request headers used in request associated with response
     * @return ShapeTreeResource instance with contents and response headers from response
     */
    public static mapFetchResponseToShapeTreeResource(response: Response, requestURI: URL, requestHeaders: Map<String, string[]>): ShapeTreeResource {
        const shapeTreeResource: ShapeTreeResource = new ShapeTreeResource();

        shapeTreeResource.setExists(response.isSuccessful());
        shapeTreeResource.setContainer(FetchHelper.isContainerFromHeaders(requestHeaders));

        try {
            const body: ResponseBody | null = response.body();
            if (body === null)
                throw new NullPointerException("response body")
            shapeTreeResource.setBody(body.string());
        } catch (ex /* IOException | NullPointerException */) {
            log.error("Exception retrieving body string");
            shapeTreeResource.setBody(null);
        }
        shapeTreeResource.setAttributes(response.headers());
        const location: string | null = response.header(HttpHeaders.LOCATION, requestURI.href);
        if (location === null)
            throw new NullPointerException("response location");
        shapeTreeResource.setUri(new URL(location!!));

        return shapeTreeResource;
    }

    /**
     * Maps an Fetch Response object to a ShapeTreeResponse object
     * @param response Fetch Response object
     * @return ShapeTreeResponse with values from Fetch response
     */
    public static mapFetchResponseToShapeTreeResponse(response: Response): ShapeTreeResponse {
        const shapeTreeResponse: ShapeTreeResponse = new ShapeTreeResponse();
        try {
            const respBody: ResponseBody | null = response.body();
            if (respBody === null)
                throw new NullPointerException("HTTP response body");
            shapeTreeResponse.setBody(respBody.string());
        } catch (ex /* IOException | NullPointerException */) {
            log.error("Exception retrieving body string");
            shapeTreeResponse.setBody(null);
        }
        shapeTreeResponse.setHeaders(response.headers());
        shapeTreeResponse.setStatusCode(response.code());
        return shapeTreeResponse;
    }

    private static isContainerFromHeaders(requestHeaders: Map<String, string[]>): boolean {
        const parsedLinkHeaders: Map<String, string[]> = HttpHeaderHelper.parseLinkHeadersToMap(requestHeaders.get(HttpHeaders.LINK));

        if (parsedLinkHeaders.get(LinkRelations.TYPE) != null) {
            return parsedLinkHeaders.get(LinkRelations.TYPE)!!.find(v => v === "" + LdpVocabulary.CONTAINER) !== undefined ||
                parsedLinkHeaders.get(LinkRelations.TYPE)!!.find(v => v === "" + LdpVocabulary.BASIC_CONTAINER) !== undefined;
        }
        return false;
    }
}

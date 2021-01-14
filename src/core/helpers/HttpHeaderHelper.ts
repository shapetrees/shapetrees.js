/**
 * Convenience methods related to HTTP Headers
 */

import log from "loglevel";

// @Slf4j
export default class HttpHeaderHelper {

    private static LINK_HEADER_PATTERN: RegExp = new RegExp("^<(.*?)>\\s*;\\s*rel\\s*=\"(.*?)\"\\s*");

    /**
     * Parse link headers into a map that allows retrieval of one or more values for a given link relation
     * @param headerValues Header values for Link headers
     * @return Map of values parsed using the Link Relation as the key
     */
    public static parseLinkHeadersToMap(headerValues: string[] | undefined): Map<string, string[]> {
        const linkHeaderMap: Map<string, string[]> = new Map();
        if (headerValues === undefined) {
            log.warn("No Link: header to parse");
        } else {
            for (let headerValue of headerValues) {
                const matcher = HttpHeaderHelper.LINK_HEADER_PATTERN.exec(headerValue);
                if (matcher && matcher.length >= 3) {
                    const uri: string = matcher[1];
                    const rel: string = matcher[2];
                    if (!linkHeaderMap.has(rel)) {
                        linkHeaderMap.set(rel, new Array());
                    }
                    linkHeaderMap.get(rel)!!.push(uri);
                } else {
                    log.warn("Unable to parse link header: [{}]", headerValue);
                }
            }
        }
        return linkHeaderMap;
    }
}

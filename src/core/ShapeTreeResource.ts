import { URL } from "url";

// @Getter @Setter
export default class ShapeTreeResource {
    private uri: URL; setUri(uri: URL) { this.uri = uri; }
    private body: string | null; setBody(body: string | null) { this.body = body; }
    private exists: boolean; setExists(exists: boolean) { this.exists = exists; }
    private container: boolean; setContainer(container: boolean) { this.container = container; }
    private attributes: Map<String, string[]>; setAttributes(attributes: Map<String, string[]>) { this.attributes = attributes; }

    public getFirstAttributeValue(attributeName: string): string | null {
        if (!this.attributes.has(attributeName)) return null;

        return this.attributes.get(attributeName)!![0] || null;
    }
}

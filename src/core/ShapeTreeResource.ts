import { URL } from 'url';

// @Getter @Setter
export class ShapeTreeResource {
  private uri: URL;

  setUri(uri: URL) { this.uri = uri; }
  getUri(): URL { return this.uri; }

  private body: string | null;

  setBody(body: string | null) { this.body = body; }
  getBody(): string | null { return this.body; }

  private exists: boolean;

  setExists(exists: boolean) { this.exists = exists; }
  isExists(): boolean { return this.exists; }

  private container: boolean;

  setContainer(container: boolean) { this.container = container; }
  isContainer(): boolean { return this.container; }

  private attributes: Map<string, string[]>;

  setAttributes(attributes: Map<string, string[]>) { this.attributes = attributes; }
  getAttributes(): Map<string, string[]> { return this.attributes; }

  public getFirstAttributeValue(attributeName: string): string | null {
    if (!this.attributes.has(attributeName)) return null;

    return this.attributes.get(attributeName)!![0] || null;
  }
}

import { URL } from 'url';

// @Getter @Setter
export class ShapeTreeResource {
  constructor(
    private uri: URL,
    private exists: boolean,
    private container: boolean,
    private attributes: Map<string, string[]>,
  ) { }

  // setUri(uri: URL) { this.uri = uri; }
  getUri(): URL { return this.uri; }

  private body: string | null = null;

  setBody(body: string | null) { this.body = body; }
  getBody(): string | null { return this.body; }

  // setExists(exists: boolean) { this.exists = exists; }
  isExists(): boolean { return this.exists; }

  // setContainer(container: boolean) { this.container = container; }
  isContainer(): boolean { return this.container; }

  // setAttributes(attributes: Map<string, string[]>) { this.attributes = attributes; }
  getAttributes(): Map<string, string[]> { return this.attributes; }

  public getFirstAttributeValue(attributeName: string): string | null {
    if (!this.attributes || !this.attributes.has(attributeName)) return null;

    return this.attributes.get(attributeName)!![0] || null;
  }
}

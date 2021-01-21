import { URL } from "url";

// @Getter @AllArgsConstructor
export class DocumentContents {
  constructor(
    private uri: URL,
    private body: string,
    private contentType: string
  ) { }

  setUri(uri: URL): void { this.uri = uri; }
  setBody(body: string): void { this.body = body; }
  setContentType(contentType: string): void { this.contentType = contentType; }

  getUri(): URL { return this.uri; }
  getBody(): string { return this.body; }
  getContentType(): string { return this.contentType; }
}

// @Getter @Setter
export class ShapeTreeResponse {
  constructor(
    protected statusCode: number,
    protected body: string,
  ) { }

  // setStatusCode(statusCode: number) { this.statusCode = statusCode; }
  getStatusCode(): number { return this.statusCode; }

  // setBody(body: string | null) { this.body = body; }
  getBody(): string | null { return this.body; }

  protected headers: Map<string, string[]> = new Map();

  setHeaders(headers: Map<string, string[]>) { this.headers = headers; }

  public ShapeTreeResponse() {
    this.headers = new Map();
  }

  public getResponseHeaders(): Map<string, string[]> {
    return this.headers;
  }

  public addResponseHeader(header: string, value: string): void {
    if (!this.headers.has(header)) {
      this.headers.set(header, []);
    }

    this.headers.get(header)!.push(value);
  }

  public exists(): boolean {
    return this.statusCode !== 404;
  }
}

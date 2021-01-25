// @Getter @Setter
export class ShapeTreeResponse {
  protected statusCode: number;

  setStatusCode(statusCode: number) { this.statusCode = statusCode; }
  getStatusCode(): number { return this.statusCode; }

  protected body: string | null = null;

  setBody(body: string | null) { this.body = body; }
  getBody(): string | null { return this.body; }

  protected headers: Map<string, string[]>;

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

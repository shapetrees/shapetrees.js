// @Getter @Setter
export class ShapeTreeResponse {
    protected statusCode: number;

    setStatusCode(statusCode: number) { this.statusCode = statusCode; }

    protected body: string | null;

    setBody(body: string | null) { this.body = body; }

    protected headers: Map<String, string[]>;

    setHeaders(headers: Map<String, string[]>) { this.headers = headers; }

    public ShapeTreeResponse() {
      this.headers = new Map();
    }

    public getResponseHeaders(): Map<String, string[]> {
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

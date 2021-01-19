/*
emulation of OkHttp interface.
*/

import fetch from 'node-fetch';
import { IOException } from './exceptions';

enum Method {
    HEAD = 'HEAD', GET = 'GET', PUT = 'PUT', POST = 'POST', DELETE = 'DELETE'
}

class RequestBody {
  text: string | null;

  mediaType: string | undefined;

  private constructor(text: string | null, mediaType?: string) {
    this.text = text;
    this.mediaType = mediaType;
  }

  static create(text: string | null, mediaType?: string): RequestBody {
    return new RequestBody(text, mediaType);
  }
}

class RequestBuilder {
    private _url: string;

    headers: Map<string, string> = new Map(); // EGP: need a multimap?

    method: Method = Method.GET;

    body: string | null = null;

    url(url: string): RequestBuilder { this._url = url; return this; }

    addHeader(name: string, value: string): RequestBuilder {
      this.headers.set(name, value);
      return this;
    }

    put(body: RequestBody): RequestBuilder {
      this.method = Method.PUT;
      this.body = body.text;
      return this;
    }

    post(body: RequestBody): RequestBuilder {
      this.method = Method.POST;
      this.body = body.text;
      return this;
    }

    patch(body: RequestBody): RequestBuilder {
      this.method = Method.POST; // ericP: is solid inventing methods?
      this.body = body.text;
      return this;
    }

    delete(): RequestBuilder {
      this.method = Method.DELETE; // ericP: is solid inventing methods?
      this.body = null;
      return this;
    }

    // eslint-disable-next-line class-methods-use-this
    build(): Request { return new Request(this.method, this._url, this.headers, this.body); }
}

class Request {
  constructor(
    public method: Method,
    public url: string,
    public headers: Map<string, string>,
    public body: string | null,
  ) { }

  static Builder = RequestBuilder;
}
Request.Builder = RequestBuilder;

interface Interceptor {
}

class FetchClientBuilder {
  _interceptors: Interceptor[] = new Array();

  interceptors(): Interceptor[] { return this._interceptors; }

  build(): FetchHttpClient { return new FetchHttpClient(this._interceptors); }
}

class FetchHttpClient {
  private _interceptors: Interceptor[];

  constructor(interceptors?: Interceptor[]) {
    if (interceptors) this._interceptors = interceptors;
  }

  static Builder = FetchClientBuilder;

  // eslint-disable-next-line class-methods-use-this
  newBuilder(): FetchClientBuilder { return new FetchClientBuilder(); }

  newCall(request: Request): HttpCall { return new HttpCall(this, request); }
}
FetchHttpClient.Builder = FetchClientBuilder;

class HttpCall {
  constructor(public client: FetchHttpClient, public request: Request) {
  }

  // eslint-disable-next-line class-methods-use-this
  async execute(): Promise<Response> {
    const headers: { [key: string]: string; } = {};
    for (const [key, val] of this.request.headers) {
      headers[key] = val;
    }
    const parms = {
      method: this.request.method,
      headers,
      data: this.request.body,
    };
    try {
      const resp = await fetch(this.request.url, parms);
      return new Response(resp, this.request);
    } catch (e) {
      // console.warn(`${this.request.method}ing ${this.request.url}`, e);
      throw new IOException(`${this.request.method}ing ${this.request.url}`, e);
    }
  }
}

class Response {
  _code: number;

  constructor(public resp: any, public req: Request) {
    this._code = resp.status;
  }

  code(): number { return this._code; }

  isSuccessful(): boolean { return this._code.toString().startsWith('2'); }

  _headers: Map<string, string[]>;

  headers() { return this._headers; }

  header(key: string, _default?: string): string | null {
    const list = this._headers.get(key);
    return list === undefined || list.length > 1
      ? _default || null
      : list[0];
  }

  // eslint-disable-next-line class-methods-use-this
  body(): ResponseBody | null { return new ResponseBody(); }
}

class ResponseBody {
  // eslint-disable-next-line class-methods-use-this
  string(): string { return ''; }
}

export {
  Request,
  RequestBody,
  RequestBuilder, // ericP: should be in a Request.Builder namespace to really be parallel
  Response,
  ResponseBody,
  FetchHttpClient,
  Interceptor,
};

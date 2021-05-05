/* eslint-disable no-underscore-dangle */
/*
emulation of OkHttp interface.
*/

import fetch from 'cross-fetch';
import { URL } from 'url';
import { IOException, RuntimeException } from './exceptions';

enum HttpRequestMethod {
  HEAD = 'HEAD', GET = 'GET', PUT = 'PUT', POST = 'POST', DELETE = 'DELETE'
}

type Headers = Map<string, string[]>;

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
  private _url: URL;

  _headers: Map<string, string[]> = new Map(); // EGP: need a multimap?

  method: HttpRequestMethod = HttpRequestMethod.GET;

  body: string | null = null;

  url(url: URL): RequestBuilder { this._url = url; return this; }

  headers(newHeaders: Map<string, string[]>): RequestBuilder {
    this._headers = newHeaders;
    return this;
  }

  addHeader(name: string, value: string): RequestBuilder {
    this._headers.set(name, [value]);
    return this;
  }

  put(body: RequestBody): RequestBuilder {
    this.method = HttpRequestMethod.PUT;
    this.body = body.text;
    return this;
  }

  post(body: RequestBody): RequestBuilder {
    this.method = HttpRequestMethod.POST;
    this.body = body.text;
    return this;
  }

  patch(body: RequestBody): RequestBuilder {
    this.method = HttpRequestMethod.POST; // ericP: is solid inventing methods?
    this.body = body.text;
    return this;
  }

  delete(): RequestBuilder {
    this.method = HttpRequestMethod.DELETE; // ericP: is solid inventing methods?
    this.body = null;
    return this;
  }

  // eslint-disable-next-line class-methods-use-this
  build(): Request { return new Request(this.method, this._url, this._headers, this.body); }
}

class Request {
  public url: URL
  constructor(
    public method: HttpRequestMethod,
    url: URL | string,
    public headers: Map<string, string[]>,
    public body: string | null,
  ) {
    this.url = typeof url === 'string' ? new URL(url) : url;
  }

  header(key: string): string | undefined {
    const ret = this.headers.get(key);
    return ret ? ret.join(',') : undefined;
  }

  static Builder = RequestBuilder;
}

interface Chain {
  // public abstract fun call(): okhttp3.Call
  // public abstract fun connectTimeoutMillis(): kotlin.Int
  // public abstract fun connection(): okhttp3.Connection?
  proceed(request: Request): Promise<Response>;
  // public abstract fun readTimeoutMillis(): kotlin.Int
  request(): Request;
  // public abstract fun withConnectTimeout(timeout: kotlin.Int, unit: java.util.concurrent.TimeUnit): okhttp3.Interceptor.Chain
  // public abstract fun withReadTimeout(timeout: kotlin.Int, unit: java.util.concurrent.TimeUnit): okhttp3.Interceptor.Chain
  // public abstract fun withWriteTimeout(timeout: kotlin.Int, unit: java.util.concurrent.TimeUnit): okhttp3.Interceptor.Chain
  // public abstract fun writeTimeoutMillis(): kotlin.Int
}

interface Interceptor {
  intercept(chain: Chain): Promise<Response>
}

class FetchClientBuilder {
  _interceptors: Interceptor[] = new Array();
  _followRedirects: FollowRedirects = FollowRedirects.NEVER;

  interceptors(): Interceptor[] { return this._interceptors; }
  followRedirects(followRedirects: FollowRedirects): FetchClientBuilder { this._followRedirects = followRedirects; return this; }

  build(): FetchHttpClient { return new FetchHttpClient(this._interceptors); }
}

class FetchHttpClient {
  _interceptors: Interceptor[];

  constructor(interceptors?: Interceptor[]) {
    this._interceptors = interceptors || [];
  }

  static Builder = FetchClientBuilder;

  // eslint-disable-next-line class-methods-use-this
  newBuilder(): FetchClientBuilder { return new FetchClientBuilder(); }

  newCall(request: Request): HttpCall { return new HttpCall(this, request); }
}

class HttpCall {
  constructor(public client: FetchHttpClient, public request: Request) { }

  // eslint-disable-next-line class-methods-use-this
  async execute(): Promise<Response> {
    if (this.client._interceptors.length === 0) {
      return myProceed(this.request);
    }
    return this.client._interceptors[0].intercept(new ChainImpl(this.request, this.client._interceptors[0], myProceed));

    async function myProceed(request: Request): Promise<Response> {
      const reqHeaders: { [key: string]: string; } = {};
      for (const [key, vals] of request.headers) {
        reqHeaders[key] = vals.join(','); // @@ should split on ',' for all comma list headers?
      }
      const parms = {
        method: request.method,
        headers: reqHeaders,
        data: request.body,
      };
      try {
        // @@ should change to the more typed version below
        const resp = await fetch(request.url.href, parms);
        const respHeaders: Headers = new Map();
        // @ts-ignore: type doesn't include iterator symbol
        for (const [header, value] of resp.headers) {
          respHeaders.set(header, [value]);
        }
        // const respHeaders: Headers = Object.entries(resp.headers)
        //   .reduce((acc: Map<string, string[]>, pair) => {
        //     acc.set(pair[0], [pair[1]]);
        //     return acc;
        //   }, new Map());
        const text: string = await resp.text();
        return new Response(resp.status, new ResponseBody(text, resp.headers.get('content-type')), respHeaders, request);
      } catch (e) {
        throw new IOException(`${request.method}ing ${request.url}`, e);
      }
    }
  }
}

class ChainImpl implements Chain {
  constructor(public _request: Request, public interceptor: Interceptor, public _proceed: (request: Request) => Promise<Response>) { }
  request(): Request { return this._request; }
  proceed(request: Request): Promise<Response> { return this._proceed(request); }
}

class ResponseBuilder {
  _code: number = 500;
  _body: ResponseBody = new ResponseBody('ResponseBuilder not initialized', 'text/plain');
  _headers: Map<string, string[]> = new Map();
  _request: any;
  code(c: number): ResponseBuilder { this._code = c; return this; }
  body(b: ResponseBody): ResponseBuilder { this._body = b; return this; }
  headers(h: Headers): ResponseBuilder { this._headers = h; return this; }
  request(r: Request): ResponseBuilder { this._request = r; return this; }
  build(): Response { return new Response(this._code, this._body, this._headers, this._request); }
}

class Response {
  constructor(code: number, body: ResponseBody, headers: Map<string, string[]>, request: Request | null = null) {
    this._code = code;
    this._message = Response.codeToMessage.get(code) || 'bummer';
    this._body = body;
    for (const [h, v] of headers.entries()) {
      this._headers.set(h, v);
    }
  }

  _code: number = 500;
  _message: string = 'bummer';
  private static codeToMessage: Map<number, string> = new Map([
    [200, 'OK'],
    [401, 'Not Authorized'],
    [403, 'Forbidden'],
  ]);

  code(): number { return this._code; }
  message(): string { return this._message; }

  isSuccessful(): boolean { return this._code.toString().startsWith('2'); }

  _headers: Map<string, string[]> = new Map();

  headers() { return this._headers; }

  header(key: string, _default?: string): string | null {
    const list = this._headers.get(key.toLowerCase());
    return list === undefined || list.length > 1
      ? _default || null
      : list[0];
  }

  _body: ResponseBody = new ResponseBody('Response not initialized', 'text/plain');

  // eslint-disable-next-line class-methods-use-this
  body(): ResponseBody | null { return this._body; }
}

class ResponseBody {
  // eslint-disable-next-line class-methods-use-this
  constructor(
    public text: string,
    public mediaType: string | null,
  ) { }

  string(): string { return this.text; }

  static create(text: string, mediaType: string): ResponseBody { return new ResponseBody(text, mediaType); }
}

class FetchClient {
  newCall(request: Request): HttpCall {
    return new HttpCall(new FetchHttpClient(), request);
  }
}

enum FollowRedirects {
  NEVER
}
class HttpClient {
  static newBuilder(): FetchClientBuilder { return new FetchClientBuilder(); }
}
class HttpRequest {
  static newBuilder(): FetchClientBuilder { return new FetchClientBuilder(); }
}

class MediaType {
  static get(s: string): string {
    const m = s.match(/^([^;]+)((?:[;,] )[a-zA-Z]+=[^,]+)*$/);
    if (m === null) {
      throw new RuntimeException('Could not parse "' + s + '" as a media type');
    }
    return m[1];
  }
}

export {
  Request,
  Headers,
  RequestBody,
  HttpRequestMethod,
  RequestBuilder, // ericP: should be in a Request.Builder namespace to really be parallel
  ResponseBuilder,
  Response,
  ResponseBody,
  FetchHttpClient,
  Chain,
  Interceptor,
  FetchClient,
  FollowRedirects,
  HttpClient,
  HttpRequest,
  MediaType,
};

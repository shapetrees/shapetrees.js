/*
emulation of OkHttp interface.
*/

import fetch from 'node-fetch';
import { URL } from 'url';
import { IOException, RuntimeException } from './exceptions';

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
  private _url: URL;

  _headers: Map<string, string[]> = new Map(); // EGP: need a multimap?

  method: Method = Method.GET;

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
  build(): Request { return new Request(this.method, this._url, this._headers, this.body); }
}

class Request {
  public url: URL
  constructor(
    public method: Method,
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
Request.Builder = RequestBuilder;

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
  intercept(chain: Chain): Response
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
    if (interceptors) this._interceptors = interceptors;
  }

  static Builder = FetchClientBuilder;

  // eslint-disable-next-line class-methods-use-this
  newBuilder(): FetchClientBuilder { return new FetchClientBuilder(); }

  newCall(request: Request): HttpCall { return new HttpCall(this, request); }
}
FetchHttpClient.Builder = FetchClientBuilder;

class HttpCall {
  constructor(public client: FetchHttpClient, public request: Request) { }

  // eslint-disable-next-line class-methods-use-this
  async execute(): Promise<Response> {
    if (this.client._interceptors.length === 0)
      return myProceed(this.request);
    else
      return this.client._interceptors[0].intercept(new ChainImpl(this.request, this.client._interceptors[0], myProceed));

    function myProceed(request: Request): Promise<Response> {

      const headers: { [key: string]: string; } = {};
      for (const [key, vals] of request.headers) {
        headers[key] = vals.join(','); // @@ should split on ',' for all comma list headers?
      }
      const parms = {
        method: request.method,
        headers,
        data: request.body,
      };
      try {
        // @@ should change to the more typed version below
        return fetch(request.url, parms).then(
          resp => new Response(resp, request)
        );
        // const resp = await fetch(request.url, parms);
        // return new Response(resp, request);
      } catch (e) {
        console.warn(`${request.method}ing ${request.url}`, e);
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

class Response {
  _code: number;

  constructor(public resp: any, public req: Request) {
    this._code = resp.status;
    for (const [h, v] of resp.headers.entries()) {
      this._headers.set(h, [v]);
    }
  }

  code(): number { return this._code; }

  isSuccessful(): boolean { return this._code.toString().startsWith('2'); }

  _headers: Map<string, string[]> = new Map();

  headers() { return this._headers; }

  header(key: string, _default?: string): string | null {
    const list = this._headers.get(key.toLowerCase());
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

class FetchClient {
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
  RequestBody,
  RequestBuilder, // ericP: should be in a Request.Builder namespace to really be parallel
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

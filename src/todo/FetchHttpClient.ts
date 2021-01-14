/*
emulation of OkHttp interface.
*/

enum Method {
    HEAD = "HEAD", GET = "GET", PUT = "PUT", POST = "POST", DELETE = "DELETE"
}
class RequestBuilder {
    _url: string;
    _headers: Map<string, string>; // EGP: need a multimap?
    _method: Method = Method.GET;
    _body: string | null = null;
    url(url: string): RequestBuilder { this._url = url; return this; }
    addHeader(name: string, value: string): RequestBuilder {
        this._headers.set(name, value);
        return this;
    }
    put(body: RequestBody): RequestBuilder {
        this._method = Method.PUT;
        this._body = body.text;
        return this;
    }
    post(body: RequestBody): RequestBuilder {
        this._method = Method.POST;
        this._body = body.text;
        return this;
    }
    patch(body: RequestBody): RequestBuilder {
        this._method = Method.POST; // ericP: is solid inventing methods?
        this._body = body.text;
        return this;
    }
    delete(): RequestBuilder {
        this._method = Method.DELETE; // ericP: is solid inventing methods?
        this._body = null;
        return this;
    }
    build(): Request { return new Request; }
}

class Request {
    static Builder = RequestBuilder;
}
Request.Builder = RequestBuilder;

class RequestBody {
    text: string | null;
    mediaType: string | undefined;
    private constructor(text: string | null, mediaType?: string) {
        this.text = text;
        this.mediaType = mediaType
    }
    static create(text: string | null, mediaType?: string): RequestBody {
        return new RequestBody(text, mediaType)
    }
}

interface Interceptor {
}

class FetchClientBuilder {
    _interceptors: Interceptor[];
    interceptors(): Interceptor[] { return this._interceptors; }
    build(): FetchHttpClient { return new FetchHttpClient(this._interceptors); }
}

class FetchHttpClient {
    private _interceptors: Interceptor[];
    constructor(interceptors?: Interceptor[]) {
        if (interceptors)
            this._interceptors = interceptors;
    }
    static Builder = FetchClientBuilder;
    newBuilder(): FetchClientBuilder { return new FetchClientBuilder(); }
    newCall(request: Request): HttpCall { return new HttpCall(this, request); }
}
FetchHttpClient.Builder = FetchClientBuilder;

class HttpCall {
    constructor(public client: FetchHttpClient, public request: Request) { }
    execute(): Response { return new Response(); }
}

class Response {
    _code: number;
    code(): number { return this._code; }
    isSuccessful(): boolean { return this._code.toString().startsWith('2') }
    _headers: Map<string, string[]>;
    headers() { return this._headers; }
    header(key: string, _default?: string): string | null {
        const list = this._headers.get(key);
        return list === undefined || list.length > 1
            ? _default || null
            : list[0];
    }
    body(): ResponseBody | null { return new ResponseBody(); }
}

class ResponseBody {
    string(): string { return ""; }
}


export {
    Request,
    RequestBody,
    RequestBuilder, // ericP: should be in a Request.Builder namespace to really be parallel
    Response,
    ResponseBody,
    FetchHttpClient,
    Interceptor
}

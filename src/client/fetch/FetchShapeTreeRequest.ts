// @Slf4j
import { HttpHeaders, ShapeTreeResourceType } from '@core/enums';
import { HttpHeaderHelper } from '@core/helpers/HttpHeaderHelper';
import { ShapeTreeRequest } from '@core/ShapeTreeRequest';
import { Request } from '@todo/FetchHttpClient';
import { URL } from 'url';

export class FetchShapeTreeRequest implements ShapeTreeRequest<Request> {
  private request: Request;
  private resourceType: ShapeTreeResourceType | null = null;

  public constructor(request: Request) {
    this.request = request;
  }

  // @Override
  public getNativeRequest(): Request {
    return this.request;
  }

  // @Override
  public getMethod(): string {
    return this.request.method;
  }

  // @Override
  public getURI(): URL {
    return this.request.url;
  }

  // @Override
  public getHeaders(): Map<string, string[]> {
    return this.request.headers;
  }

  // @Override
  public getLinkHeaders(): Map<string, string[]> {
    return HttpHeaderHelper.parseLinkHeadersToMap(this.getHeaderValues(HttpHeaders.LINK));
  }

  // @Override
  public getHeaderValues(header: string): string[] | undefined {
    return this.request.headers.get(header);
  }

  // @Override
  public getHeaderValue(header: string): string | undefined {
    return this.request.header(header);
  }

  // @Override
  public getContentType(): string | null {
    if (this.getHeaders().has(HttpHeaders.CONTENT_TYPE)) {
      return this.getHeaders().get(HttpHeaders.CONTENT_TYPE)!!.join(',');
    }
    return null;
  }

  // @Override
  public getResourceType(): ShapeTreeResourceType | null {
    return this.resourceType;
  }

  // @Override
  public setResourceType(resourceType: ShapeTreeResourceType): void {
    this.resourceType = resourceType;
  }

  // @Override
  public getBody(): string | null {
    return this.request.body;
    /*
    try (buffer: Buffer = new Buffer()) {
      if (this.request.body() != null) {
        Objects.requireNonNull(this.request.body()).writeTo(buffer);
      }
      return buffer.readUtf8();
    } catch (IOException | NullPointerException ex) {
      log.error("Error writing body to string");
      return null;
    }
    */
  }
}

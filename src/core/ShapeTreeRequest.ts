import { URL } from "url";
import { ShapeTreeResourceType } from "./enums";

export interface ShapeTreeRequest<T> {
  getNativeRequest(): T;
  getMethod(): string;
  getURI(): URL;
  getHeaders(): Map<string, string[]>;
  getLinkHeaders(): Map<string, string[]>;
  getHeaderValues(header: string): string[] | undefined;
  getHeaderValue(header: string): string | undefined;
  getBody(): string | null;
  getContentType(): string | null;
  getResourceType(): ShapeTreeResourceType;
  setResourceType(resourceType: ShapeTreeResourceType): void;
}

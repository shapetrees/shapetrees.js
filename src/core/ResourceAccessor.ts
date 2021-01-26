import { URL } from 'url';
import { ShapeTreeContext } from '@core/models/ShapeTreeContext';
import { ShapeTreeResource } from './ShapeTreeResource';

export interface ResourceAccessor {
  getResource(context: ShapeTreeContext, resourceURI: URL): Promise<ShapeTreeResource> /* throws ShapeTreeException */;
  createResource(context: ShapeTreeContext, resourceURI: URL, headers: Map<string, string[]>, body: string, contentType: string): Promise<ShapeTreeResource> /* throws ShapeTreeException */;
  updateResource(context: ShapeTreeContext, updatedResource: ShapeTreeResource): Promise<ShapeTreeResource> /* throws ShapeTreeException */;
}

import { URL } from 'url';
import { ShapeTreeResource } from './ShapeTreeResource';
import { ShapeTreeContext } from '@core/models/ShapeTreeContext';

export interface ResourceAccessor {
  getResource(context: ShapeTreeContext, resourceURI: URL): ShapeTreeResource /* throws ShapeTreeException */;
  createResource(context: ShapeTreeContext, resourceURI: URL, headers: Map<string, string[]>, body: string, contentType: string): ShapeTreeResource /* throws ShapeTreeException */;
  updateResource(context: ShapeTreeContext, updatedResource: ShapeTreeResource): ShapeTreeResource /* throws ShapeTreeException */;
}

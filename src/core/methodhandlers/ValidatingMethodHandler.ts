import { ShapeTreeRequest } from "@core/ShapeTreeRequest";
import { ShapeTreeValidationResponse } from "@core/ShapeTreeValidationResponse";

export interface ValidatingMethodHandler<T> {
  validateRequest(shapeTreeRequest: ShapeTreeRequest<T>): ShapeTreeValidationResponse /* throws ShapeTreeException */;
}

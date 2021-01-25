import { ShapeTreeRequest } from "@core/ShapeTreeRequest";
import { ShapeTreeValidationResponse } from "@core/ShapeTreeValidationResponse";

export interface ValidatingMethodHandler {
  validateRequest(shapeTreeRequest: ShapeTreeRequest<any>): Promise<ShapeTreeValidationResponse> /* throws ShapeTreeException */;
}

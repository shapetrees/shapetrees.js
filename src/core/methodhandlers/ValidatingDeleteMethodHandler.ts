import { ShapeTreeException } from '@core/exceptions';
import { ResourceAccessor } from '@core/ResourceAccessor';
import { ShapeTreeRequest } from '@core/ShapeTreeRequest';
import { ShapeTreeValidationResponse } from '@core/ShapeTreeValidationResponse';
import { AbstractValidatingMethodHandler } from './AbstractValidatingMethodHandler';
import { ValidatingMethodHandler } from './ValidatingMethodHandler';

export class ValidatingDeleteMethodHandler extends AbstractValidatingMethodHandler implements ValidatingMethodHandler {

  public constructor(resourceAccessor: ResourceAccessor) {
    super(resourceAccessor);
  }

  // @Override
  public async validateRequest(shapeTreeRequest: ShapeTreeRequest<any>): Promise<ShapeTreeValidationResponse> /* throws ShapeTreeException */ {
    try {
      return ShapeTreeValidationResponse.passThroughResponse();
    } catch (ex/*: Exception */) {
      return new ShapeTreeValidationResponse(new ShapeTreeException(500, ex.message));
    }
  }
}

import { ShapeTreeException } from '@core/exceptions';
import { ShapeTreeResponse } from './ShapeTreeResponse';
import { ValidationContext } from './models/ValidationContext';

// @Getter @Setter
export class ShapeTreeValidationResponse extends ShapeTreeResponse {
  private requestFulfilled: boolean;
  private validRequest: boolean;
  private validationContext: ValidationContext | null = null;

  setRequestFulfilled(requestFulfilled: boolean): void { this.requestFulfilled = requestFulfilled; }
  setValidRequest(validRequest: boolean): void { this.validRequest = validRequest; }
  setValidationContext(validationContext: ValidationContext | null): void { this.validationContext = validationContext; }

  isRequestFulfilled(): boolean { return this.requestFulfilled; }
  isValidRequest(): boolean { return this.validRequest; }
  getValidationContext(): ValidationContext | null { return this.validationContext; }

  public constructor(steOrCode: ShapeTreeException | number, bodyP?: string) {
    // annoying workaround for: error TS2376: A 'super' call must be the first statement in the constructor when a class contains initialized properties, parameter properties, or private identifiers.
    super(
      steOrCode instanceof ShapeTreeException ? steOrCode.getStatusCode() : steOrCode,
      steOrCode instanceof ShapeTreeException ? steOrCode.getMessage() : bodyP!,
    );
    if (steOrCode instanceof ShapeTreeException) {
      this.validRequest = false;
      this.requestFulfilled = false;
    } else {
      this.validRequest = true;
      this.requestFulfilled = true;
    }
  }

  public static passThroughResponse(validationContext: ValidationContext | null = null): ShapeTreeValidationResponse { // !! shouldn't response be literally passed through rather than cerating a ValResp?
    const response: ShapeTreeValidationResponse = new ShapeTreeValidationResponse(200, ''); // Body-less responses: PUT, POST, PATCH, DELETE
    response.setValidRequest(true);
    response.setRequestFulfilled(false);
    response.setValidationContext(validationContext);
    return response;
  }
}

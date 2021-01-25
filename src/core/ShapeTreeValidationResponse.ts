import { ShapeTreeException } from '@core/exceptions';
import { ShapeTreeResponse } from './ShapeTreeResponse';
import { ValidationContext } from './models/ValidationContext';

// @Getter @Setter
export class ShapeTreeValidationResponse extends ShapeTreeResponse {
  private requestFulfilled: boolean;
  private validRequest: boolean;
  private validationContext: ValidationContext | null;

  setRequestFulfilled(requestFulfilled: boolean): void { this.requestFulfilled = requestFulfilled; }
  setValidRequest(validRequest: boolean): void { this.validRequest = validRequest; }
  setValidationContext(validationContext: ValidationContext | null): void { this.validationContext = validationContext; }

  isRequestFulfilled(): boolean { return this.requestFulfilled; }
  isValidRequest(): boolean { return this.validRequest; }
  getValidationContext(): ValidationContext | null { return this.validationContext; }

  public constructor(ste?: ShapeTreeException) {
    super();
    if (ste) {
      this.validRequest = false;
      this.requestFulfilled = false;
      this.statusCode = ste.getStatusCode();
      this.body = ste.getMessage();
    }
  }

  public static passThroughResponse(validationContext: ValidationContext | null = null): ShapeTreeValidationResponse {
    const response: ShapeTreeValidationResponse = new ShapeTreeValidationResponse();
    response.setValidRequest(true);
    response.setRequestFulfilled(false);
    response.setValidationContext(validationContext);
    return response;
  }
}

/**
 * Interceptor used for client-side validation
 */

import log from 'loglevel';
import { Chain, Interceptor, MediaType, Headers, Request, ResponseBuilder, Response, ResponseBody } from '@todo/FetchHttpClient';
import { ShapeTreeRequest } from '@core/ShapeTreeRequest';
import { FetchShapeTreeRequest } from './FetchShapeTreeRequest';
import { ResourceAccessor } from '@core/ResourceAccessor';
import { FetchRemoteResourceAccessor } from './FetchRemoteResourceAccessor';
import { ValidatingMethodHandler } from '@core/methodhandlers/ValidatingMethodHandler';
import { ShapeTreeValidationResponse } from '@core/ShapeTreeValidationResponse';
import { ShapeTreeException } from '@core/exceptions';
import { ProgramFlowException, RuntimeException } from '@todo/exceptions';
import { ShapeTreeResponse } from '@core/ShapeTreeResponse';
import { FetchHelper } from './FetchHelper';
import { ValidatingPostMethodHandler } from '@core/methodhandlers/ValidatingPostMethodHandler';

// @Slf4j
export class ValidatingShapeTreeInterceptor implements Interceptor {
  private static POST: string = 'POST';

  private static PUT: string = 'PUT';

  private static PATCH: string = 'PATCH';

  private static DELETE: string = 'DELETE';

  /**
     * Key method on Interceptor class which is implemented on an intercepted HTTP call.
     * Responsible for initializing a shape tree validation handler based on the HTTP method that
     * was intercepted.
     *
     * ShapeTreeResponse is used to determine whether an artificial response from the validation library should
     * be returned or if the original request should be passed through to the 'real' server.
     *
     * @param chain Fetch request chain
     * @return Response to return back to intercepting chain
     * @throws IOException IOException thrown from chain.proceed
     */
  // @NotNull
  // @Override
  public async intercept(/* @NotNull */ chain: Chain): Promise<Response> /* throws IOException */ {
    const shapeTreeRequest: ShapeTreeRequest<Request> = new FetchShapeTreeRequest(chain.request());
    const resourceAccessor: ResourceAccessor = await new FetchRemoteResourceAccessor();

    // Get the handler
    const handler: ValidatingMethodHandler | null = this.getHandler(shapeTreeRequest.getMethod(), resourceAccessor);
    if (handler !== null) {
      try {
        const shapeTreeResponse: ShapeTreeValidationResponse = await handler.validateRequest(shapeTreeRequest);
        if (shapeTreeResponse.isValidRequest() && !shapeTreeResponse.isRequestFulfilled()) {
          return await chain.proceed(chain.request());
        }
        return this.createResponse(shapeTreeRequest, shapeTreeResponse);
      } catch (ex/*: ShapeTreeException */) {
        if (ex instanceof ShapeTreeException) {
          log.error("Error processing shape tree request: ", ex);
          return this.createErrorResponse(ex, shapeTreeRequest);
        }
        if (ex instanceof RuntimeException) {
          log.error("Error processing shape tree request: ", ex);
          return this.createErrorResponse(new ShapeTreeException(500, ex.message), shapeTreeRequest);
        }
        throw new ProgramFlowException(ex.stack);
      }
    } else {
      log.warn("No handler for method [{}] - passing through request", shapeTreeRequest.getMethod());
      return chain.proceed(chain.request());
    }
  }

  private getHandler(requestMethod: string, resourceAccessor: ResourceAccessor): ValidatingMethodHandler | null {
    switch (requestMethod) {
      case ValidatingShapeTreeInterceptor.POST:
        return new ValidatingPostMethodHandler(resourceAccessor);
      // !! TODO case ValidatingShapeTreeInterceptor.PUT:
      //   return new ValidatingPutMethodHandler(resourceAccessor);
      // case ValidatingShapeTreeInterceptor.PATCH:
      //   return new ValidatingPatchMethodHandler(resourceAccessor);
      // case ValidatingShapeTreeInterceptor.DELETE:
      //   return new ValidatingDeleteMethodHandler(resourceAccessor);
      default:
        return null;
    }
  }

  // TODO: Update to a simple JSON-LD body
  private createErrorResponse(exception: ShapeTreeException, request: ShapeTreeRequest<Request>): Response {
    return new ResponseBuilder()
      .code(exception.getStatusCode())
      .body(ResponseBody.create(exception.getMessage(), MediaType.get("text/plain")))
      .request(request.getNativeRequest())
      // @@ .protocol(Protocol.HTTP_2)
      // @@ .message(exception.getMessage())
      .build();
  }

  private createResponse(request: ShapeTreeRequest<Request>, response: ShapeTreeResponse): Response {
    const builder: ResponseBuilder = new ResponseBuilder();
    builder.code(response.getStatusCode());
    const headers: Headers = FetchHelper.convertHeaders(response.getResponseHeaders());
    builder.headers(headers);
    let contentType: string | undefined = (headers.get("Content-Type") || [undefined])[0];
    if (contentType === undefined) {
      contentType = "text/turtle";
    }

    builder.body(ResponseBody.create(response.getBody() || '', MediaType.get(contentType)))
      // @@ .protocol(Protocol.HTTP_2)
      // .message("Success")
      .request(request.getNativeRequest());

    return builder.build();
  }
}

import { ShapeTreeResourceType } from '@core/enums';
import { ShapeTreeException } from '@core/exceptions';
import { ShapeTreeContext } from '@core/models/ShapeTreeContext';
import { ShapeTreePlantResult } from '@core/models/ShapeTreePlantResult';
import { ValidationContext } from '@core/models/ValidationContext';
import { ResourceAccessor } from '@core/ResourceAccessor';
import { ShapeTreeRequest } from '@core/ShapeTreeRequest';
import { ShapeTreeResource } from '@core/ShapeTreeResource';
import { ShapeTreeValidationResponse } from '@core/ShapeTreeValidationResponse';
import { Store } from 'n3';
import { URL } from 'url';
import { AbstractValidatingMethodHandler } from './AbstractValidatingMethodHandler';
import { ValidatingMethodHandler } from './ValidatingMethodHandler';

export class ValidatingPutMethodHandler extends AbstractValidatingMethodHandler implements ValidatingMethodHandler {

  public constructor(resourceAccessor: ResourceAccessor) {
    super(resourceAccessor);
  }

  // @Override
  public async validateRequest(shapeTreeRequest: ShapeTreeRequest<any>): Promise<ShapeTreeValidationResponse> {
    try {
      const shapeTreeContext: ShapeTreeContext = this.buildContextFromRequest(shapeTreeRequest);
      const existingResource: ShapeTreeResource = await this.getRequestResource(shapeTreeContext, shapeTreeRequest);
      const resourceType: ShapeTreeResourceType = this.determineResourceType(shapeTreeRequest, existingResource);
      shapeTreeRequest.setResourceType(resourceType);

      const parentURI: URL = this.getParentContainerURI(existingResource);

      const normalizedBaseURI: URL = this.normalizeBaseURI(existingResource.getUri(), null, resourceType);
      const incomingRequestBodyGraph: Store | null = this.getIncomingBodyGraph(shapeTreeRequest, normalizedBaseURI);
      let requestedName: string = this.getRequestResourceName(existingResource);
      const parentContainerResource: ShapeTreeResource = await this.resourceAccessor.getResource(shapeTreeContext, parentURI);
      const validationContext: ValidationContext | null = await this.validateAgainstParentContainer(shapeTreeContext, incomingRequestBodyGraph, normalizedBaseURI, parentContainerResource, requestedName, shapeTreeRequest);
      // Two reasons for passing through the request (and not performing validation):
      // 1. Validation returns no locators, meaning the parent container is not managed
      // 2. We're creating a resource and it has already passed validation
      if (validationContext == null || validationContext.getParentContainerLocators() == null || shapeTreeRequest.getResourceType() !== ShapeTreeResourceType.CONTAINER) {
        return ShapeTreeValidationResponse.passThroughResponse(validationContext);
      }

      const results: ShapeTreePlantResult[] = new Array();
      for (const locator of validationContext.getParentContainerLocators()) {

        if (requestedName.endsWith('/')) {
          requestedName = requestedName.replace('/', '');
        }
        const result: ShapeTreePlantResult = await this.plantShapeTreeLocator(shapeTreeContext, parentContainerResource, shapeTreeRequest.getBody() || '' /* @@ */, shapeTreeRequest.getContentType() || 'text/turtle' /* @@ */, locator, validationContext.getValidatingShapeTree()!! /* @@ */, requestedName) ||
          (() => { throw new ShapeTreeException(422, 'Unable to PUT ShapeTree ' + locator.getShapeTree()); })();
        results.push(result);
      }

      return ValidatingPutMethodHandler.createPlantResponse(results, shapeTreeRequest);
    } catch (ex) {
      if (ex instanceof ShapeTreeException) {
        return new ShapeTreeValidationResponse(ex);
      }
      return new ShapeTreeValidationResponse(new ShapeTreeException(500, ex.message));
    }
  }
}

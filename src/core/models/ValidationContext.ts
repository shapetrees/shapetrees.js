import { ValidationResult } from '@core/models/ValidationResult';
import { ShapeTree } from './ShapeTree';
import { ShapeTreeLocator } from './ShapeTreeLocator';

// @Getter @AllArgsConstructor
export class ValidationContext {
  constructor(
    private validatingShapeTree: ShapeTree | null,
    private validationResult: ValidationResult | null,
    private parentContainerLocators: ShapeTreeLocator[],
  ) { }

  getValidatingShapeTree(): ShapeTree | null { return this.validatingShapeTree; }
  getValidationResult(): ValidationResult | null { return this.validationResult; }
  getParentContainerLocators(): ShapeTreeLocator[] { return this.parentContainerLocators; }

}

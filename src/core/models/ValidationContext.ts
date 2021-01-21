import { ShapeTree } from "./ShapeTree";
import { ValidationResult } from "@core/models/ValidationResult";
import { ShapeTreeLocator } from "./ShapeTreeLocator";

// @Getter @AllArgsConstructor
export class ValidationContext {
  private validatingShapeTree: ShapeTree;
  private validationResult: ValidationResult;
  private parentContainerLocators: ShapeTreeLocator[];
}

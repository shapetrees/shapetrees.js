import { IOException } from '@todo/exceptions';

// @Getter @AllArgsConstructor
export class ShapeTreeException extends IOException {
    private statusCode: number;

    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
    }
}

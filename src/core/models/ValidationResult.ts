// @Getter @AllArgsConstructor
export class ValidationResult {
  constructor(private valid: boolean) { }
  getValid(): boolean { return this.valid; };
  setValid(valid: boolean): void { this.valid = valid };
}

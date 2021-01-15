/**
 * Defines a permutation of OkHttpClient configuration
 */
// @Getter @Setter @EqualsAndHashCode @AllArgsConstructor @NoArgsConstructor
export class ShapeTreeClientConfiguration {
  constructor(
    private useValidation: boolean,
    private skipSslValidation: boolean,
  ) {}

  public getUseValidation(): boolean { return this.useValidation; }

  public getSkipSslValidation(): boolean { return this.skipSslValidation; }
}

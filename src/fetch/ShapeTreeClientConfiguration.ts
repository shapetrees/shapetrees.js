/**
 * Defines a permutation of OkHttpClient configuration
 */
// @Getter @Setter @EqualsAndHashCode @AllArgsConstructor @NoArgsConstructor
export default class ShapeTreeClientConfiguration {
    constructor(
        private useValidation: boolean,
        private skipSslValidation: boolean
    ) { }
}

// @Getter @Setter @NoArgsConstructor @AllArgsConstructor
export default class ShapeTreeContext {
    private authorizationHeaderValue: string;
    const getAuthorizationHeaderValue(): string { return this.authorizationHeaderValue; }
}

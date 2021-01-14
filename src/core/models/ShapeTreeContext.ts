// @Getter @Setter @NoArgsConstructor @AllArgsConstructor
export default class ShapeTreeContext {
    private authorizationHeaderValue: string;
    getAuthorizationHeaderValue(): string { return this.authorizationHeaderValue; }
}

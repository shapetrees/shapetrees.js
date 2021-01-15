// @Getter @Setter @NoArgsConstructor @AllArgsConstructor
export class ShapeTreeContext {
    private authorizationHeaderValue: string;

    getAuthorizationHeaderValue(): string { return this.authorizationHeaderValue; }
}

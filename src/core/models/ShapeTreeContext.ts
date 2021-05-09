// @Getter @Setter @NoArgsConstructor @AllArgsConstructor
export class ShapeTreeContext {
    private authorizationHeaderValue: string | null = null;

    getAuthorizationHeaderValue(): string | null { return this.authorizationHeaderValue; }
    setAuthorizationHeaderValue(authorizationHeaderValue: string | null): void { this.authorizationHeaderValue = authorizationHeaderValue; }
}

import { URL } from "url";

// @Getter @AllArgsConstructor
export class ReferencedShapeTree {
  constructor(
    private referencedShapeTreeURI: URL,
    private traverseViaShapePath: string
  ) { }

  getReferencedShapeTreeURI(): URL { return this.referencedShapeTreeURI; };
  setReferencedShapeTreeURI(referencedShapeTreeURI: URL): void { this.referencedShapeTreeURI = referencedShapeTreeURI };
  getTraverseViaShapePath(): string { return this.traverseViaShapePath; };
  setTraverseViaShapePath(traverseViaShapePath: string): void { this.traverseViaShapePath = traverseViaShapePath };
}

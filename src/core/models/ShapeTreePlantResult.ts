import { URL } from 'url';

// @Getter @AllArgsConstructor @NoArgsConstructor
export class ShapeTreePlantResult {
  constructor(
    private shapeTreeURI: URL,
    private rootContainer: URL,
    private rootContainerMetadata: URL,
    private createdChildren: URL[],
  ) { }

  getShapeTreeURI(): URL { return this.shapeTreeURI; }
  setShapeTreeURI(shapeTreeURI: URL): void { this.shapeTreeURI = shapeTreeURI; }
  getRootContainer(): URL { return this.rootContainer; }
  setRootContainer(rootContainer: URL): void { this.rootContainer = rootContainer; }
  getRootContainerMetadata(): URL { return this.rootContainerMetadata; }
  setRootContainerMetadata(rootContainerMetadata: URL): void { this.rootContainerMetadata = rootContainerMetadata; }
  getCreatedChildren(): URL[] { return this.createdChildren; }
  setCreatedChildren(createdChildren: URL[]): void { this.createdChildren = createdChildren; }
}

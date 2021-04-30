import { ModelFactoryBase } from './ModelFactoryBase';

export class ModelFactory extends ModelFactoryBase {
  private ModelFactory() {
  }

  /*
  /** @deprecated * /
  @Deprecated
  public static PrefixMapping setDefaultModelPrefixes(PrefixMapping pm) {
    return ModelCom.setDefaultModelPrefixes(pm);
  }

  /** @deprecated * /
  @Deprecated
  public static PrefixMapping getDefaultModelPrefixes() {
    return ModelCom.getDefaultModelPrefixes();
  }

  public static assembleModelFrom(singleRoot: Model): Model {
    return assembleModelFrom(AssemblerHelp.singleModelRoot(singleRoot));
  }

  public static findAssemblerRoots(m: Model): Set<Resource> {
    return AssemblerHelp.findAssemblerRoots(m);
  }

  public static assembleModelFrom(root: Resource): Model {
    return Assembler.general.openModel(root);
  }

  public static createDefaultModel(): Model {
    return new ModelCom(Factory.createGraphMem());
  }

  public static createModelForGraph(g: Graph): Model {
    return new ModelCom(g);
  }

  public static createMemModelMaker(): ModelMaker {
    return new ModelMakerImpl(new SimpleGraphMaker());
  }

  public static createRDFSModel(model: Model): InfModel {
    const reasoner: Reasoner = ReasonerRegistry.getRDFSReasoner();
    const graph: InfGraph = reasoner.bind(model.getGraph());
    return new InfModelImpl(graph);
  }

  public static createRDFSModel(schema: Model, model: Model): InfModel {
    const reasoner: Reasoner = ReasonerRegistry.getRDFSReasoner();
    const graph: InfGraph = reasoner.bindSchema(schema.getGraph()).bind(model.getGraph());
    return new InfModelImpl(graph);
  }

  public static createInfModel(reasoner: Reasoner, model: Model): InfModel {
    const graph: InfGraph = reasoner.bind(model.getGraph());
    return new InfModelImpl(graph);
  }

  public static createInfModel(reasoner: Reasoner, schema: Model, model: Model): InfModel {
    InfGraph graph = reasoner.bindSchema(schema.getGraph()).bind(model.getGraph());
    return new InfModelImpl(graph);
  }

  public static createInfModel(g: InfGraph): InfModel {
    return new InfModelImpl(g);
  }

  public static createOntologyModel(): OntModel {
    return createOntologyModel(ProfileRegistry.OWL_LANG);
  }

  public static createOntologyModel(languageURI: String): OntModel {
    return createOntologyModel(OntModelSpec.getDefaultSpec(languageURI), (Model)null);
  }

  public static createOntologyModel(spec: OntModelSpec, maker: ModelMaker, base: Model): OntModel {
    OntModelSpec _spec = new OntModelSpec(spec);
    _spec.setImportModelMaker(maker);
    return createOntologyModel(_spec, base);
  }

  public static createOntologyModel(spec: OntModelSpec, base: Model): OntModel {
    return new OntModelImpl(spec, base);
  }

  public static createOntologyModel(spec: OntModelSpec): OntModel {
    return new OntModelImpl(spec);
  }

  public static createUnion(m1: Model, m2: Model): Model {
    return createModelForGraph(new Union(m1.getGraph(), m2.getGraph()));
  }

  static {
    JenaSystem.init();
  }
  */
}

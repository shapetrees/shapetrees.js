export class ModelFactoryBase {
  public constructor() {
  }

  /*
  protected static gp(name: string, ifAbsent: string | null = null): string {
    const answer: string = JenaRuntime.getSystemProperty("jena." + name);
    if (answer === null) {
      if (ifAbsent !== null)
        return ifAbsent;
      throw new JenaException("no binding for " + name);
    }
    return answer;
  }
  */
}

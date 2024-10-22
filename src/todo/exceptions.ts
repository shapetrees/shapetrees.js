/* eslint-disable */

class Throwable extends Error {
  constructor(public message: string) { super(message); }
}

class RuntimeException extends Throwable {
  cause: Throwable | undefined;

  constructor(message: string, cause?: Throwable | undefined) {
    super(message);
    this.cause = cause;
  }
}

class IllegalStateException extends RuntimeException {
  constructor(message: string, cause?: Throwable | undefined) {
    super(message, cause);
  }
}

class IOException extends RuntimeException {
  constructor(message: string, cause?: Throwable | undefined) {
    super(message, cause);
  }
}

class NullPointerException extends RuntimeException {
  constructor(message: string) {
    super(message);
  }
}

class ProgramFlowException extends RuntimeException { // @@ probably reflects my lack of understanding of typescript -- ericP
  constructor(message?: string) {
    super(message || 'Should not arrive here');
  }
}

class TypeException<T> extends RuntimeException {
  constructor(message: string) {
    super(message);
  }
}

export {
  RuntimeException,
  IllegalStateException,
  IOException,
  ProgramFlowException,
  NullPointerException,
};

class Throwable extends Error {
    constructor(public message: string) { super(message) }
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

export {
    RuntimeException,
    IllegalStateException,
    IOException
}
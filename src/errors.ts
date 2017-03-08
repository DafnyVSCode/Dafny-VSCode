
export class VericationCommandFailedException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, VericationCommandFailedException.prototype);
    }
}


export class VericationRequestFailedException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, VericationCommandFailedException.prototype);
    }
}

export class CommandEndFailedException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, VericationCommandFailedException.prototype);
    }
}

export class ByteOutOfRangeException extends Error {
    constructor() {
        super("Byte value should be single between 0 and 255");
        Object.setPrototypeOf(this, ByteOutOfRangeException.prototype);
    }
}
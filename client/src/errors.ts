"use strict";

export class CommandFailedException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CommandFailedException.prototype);
    }
}

export class RequestFailedException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CommandFailedException.prototype);
    }
}

export class CommandEndFailedException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CommandFailedException.prototype);
    }
}

export class ByteOutOfRangeException extends Error {
    constructor() {
        super("Byte value should be single between 0 and 255");
        Object.setPrototypeOf(this, ByteOutOfRangeException.prototype);
    }
}

export class DafnyServerExeption extends Error {
    constructor() {
        super("Unknown server exception");
        Object.setPrototypeOf(this, DafnyServerExeption.prototype);
    }
}

export class IncorrectPathExeption extends Error {
    constructor() {
        super("Wrong path set for Dafny Server");
        Object.setPrototypeOf(this, DafnyServerExeption.prototype);
    }
}

export class DafnyUnsupportedPlatform extends Error {
    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, DafnyServerExeption.prototype);
    }
}

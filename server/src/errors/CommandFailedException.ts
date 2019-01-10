
"use strict";

export class CommandFailedException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CommandFailedException.prototype);
    }
}

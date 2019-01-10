export class DafnyServerExeption extends Error {
    constructor() {
        super("Unknown server exception");
        Object.setPrototypeOf(this, DafnyServerExeption.prototype);
    }
}

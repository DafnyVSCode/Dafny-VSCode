import { DafnyServerExeption } from "./DafnyServerExeption";
export class DafnyUnsupportedPlatform extends Error {
    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, DafnyServerExeption.prototype);
    }
}

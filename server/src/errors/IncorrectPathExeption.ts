import { DafnyServerExeption } from "./DafnyServerExeption";
export class IncorrectPathExeption extends Error {
    constructor() {
        super("Wrong path set for Dafny Server");
        Object.setPrototypeOf(this, DafnyServerExeption.prototype);
    }
}

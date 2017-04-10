import {CodeLens, TextDocument} from "vscode";
import { Reference, Symbol } from "./symbols";

export class ReferencesCodeLens extends CodeLens {
    constructor(public document: TextDocument, public symbol: Symbol) {
        super(symbol.range);
    }
}

export class ReferenceInformation {
    public fileName: string;
    public reference: Reference;
    constructor(dafnyReference: Reference, file: string) {
        this.reference = dafnyReference;
        this.fileName = file;
    }
}

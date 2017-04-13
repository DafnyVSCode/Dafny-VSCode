"use strict";
import {CodeLens, Command, Range, TextDocument} from "vscode-languageserver";
import { Reference, Symbol } from "./symbols";

export class ReferencesCodeLens implements CodeLens {
    public range: Range;
    public command?: Command;
    public data?: any;
    constructor(public document: TextDocument, public symbol: Symbol) {
        this.range = symbol.range;
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

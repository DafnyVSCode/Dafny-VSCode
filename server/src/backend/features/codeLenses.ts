"use strict";

import {CodeLens, Command, Range, TextDocument} from "vscode-languageserver";
import Uri from "vscode-uri";
import { Reference, Symbol } from "./symbols";

export class ReferencesCodeLens implements CodeLens {
    public range: Range;
    public command?: Command;
    public data?: any;
    constructor(public symbol: Symbol) {
        this.range = symbol.range;
    }
}

export class ReferenceInformation {
    public fileName: Uri;
    public reference: Reference;
    constructor(dafnyReference: Reference, file: Uri) {
        this.reference = dafnyReference;
        this.fileName = file;
    }
}

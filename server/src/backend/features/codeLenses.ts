"use strict";

import {CodeLens, Command, Range} from "vscode-languageserver";
import Uri from "vscode-uri";
import { Symbol } from "./symbols";

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
    public range: Range;
    constructor(range: Range, file: Uri) {
        this.range = range;
        this.fileName = file;
    }
}

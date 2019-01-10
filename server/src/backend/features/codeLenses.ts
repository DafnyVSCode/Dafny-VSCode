"use strict";

import {CodeLens, Command, Range} from "vscode-languageserver";
import { DafnySymbol } from "./symbols";

export class ReferencesCodeLens implements CodeLens {
    public range: Range;
    public command?: Command;
    public data?: any;
    constructor(public symbol: DafnySymbol) {
        this.range = symbol.range;
    }
}

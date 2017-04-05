import {CodeLens, TextDocument} from "vscode";
import { Reference, Symbol } from "./symbolService";
export class ReferencesCodeLens extends CodeLens {
    constructor(public document: TextDocument, public codeLensInfo: CodeLensInfo) {
        super(codeLensInfo.symbol.range);
    }
}

export class CodeLensInfo {
    public constructor(public symbol: Symbol) {
    }
}

export class ReferenceInformation {
    public fileName: string;
    public reference: Reference;
    constructor(dafnyReference: Reference, file: string) {
         if(dafnyReference) {
            this.reference = dafnyReference;
            this.fileName = file;
        }
    }
}

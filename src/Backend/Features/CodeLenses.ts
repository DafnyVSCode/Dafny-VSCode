import {CodeLens, Position, Range, TextDocument} from "vscode";
export class ReferencesCodeLens extends CodeLens {
    constructor(public document: TextDocument, public codeLensInfo: CodeLensInfo) {
        super(codeLensInfo.range);
    }
}

export class CodeLensInfo {
    public constructor(public range: Range, public symbol: string,
                       public module: string, public parentClass: string) {
    }
}

export class ReferenceInformation {
    public file: string;
    public methodName: string;
    public loc: number;
    public position: Position;
    constructor(dafnyReference: any, file: string) {
         if(dafnyReference) {
            this.methodName = dafnyReference.MethodName;
            this.loc = dafnyReference.Position;
            const line = parseInt(dafnyReference.Line, 10) - 1; // 1 based
            const column = Math.max(0, parseInt(dafnyReference.Column, 10) - 1); // ditto, but 0 can appear in some cases
            this.position = new Position(line, column);
            this.file = file;
        }
    }
}

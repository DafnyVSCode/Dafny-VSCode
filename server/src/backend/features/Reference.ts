import { Position, Range, TextDocument } from "vscode-languageserver";
import { adjustDafnyColumnPositionInfo, adjustDafnyLinePositionInfo } from "./symbols";
export class Reference {
    public column: number;
    public line: number;
    public position: number;
    public methodName: string;
    public start: Position;
    public end: Position;
    public range: Range;
    public document: TextDocument;
    public referencedName: string;
    constructor(reference: any, document: TextDocument) {
        this.column = adjustDafnyColumnPositionInfo(reference.Column);
        this.line = adjustDafnyLinePositionInfo(reference.Line);
        this.position = reference.Position;
        this.methodName = reference.MethodName;
        this.referencedName = reference.ReferencedName;
        this.start = Position.create(this.line, this.column);
        this.end = Position.create(this.line, this.column + this.referencedName.length);
        this.range = Range.create(this.start, this.end);
        this.document = document;
    }
    public isValid(): boolean {
        return !isNaN(this.column) && !isNaN(this.line) && this.methodName !== "";
    }
}
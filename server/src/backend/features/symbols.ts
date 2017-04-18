import {Position, Range, TextDocument} from "vscode-languageserver";

export enum SymbolType {
    Unknown, Class, Method, Function, Field, Call
}
export class SymbolTable {
    public symbols: Symbol[];
    public hash: number;
    public fileName: string;
    constructor(fileName: string) {
        this.symbols = [];
        this.fileName = fileName;
    }
}
export class Symbol {
    public column: number;
    public endColumn: number;
    public line: number;
    public endLine: number;
    public module: string;
    public name: string;
    public position: number;
    public endPosition: number;
    public symbolType: SymbolType;
    public parentClass: string;
    public References: Reference[];
    public start: Position;
    public end: Position;
    public range: Range;
    public call: string;
    public document: TextDocument;

    constructor(column: number, line: number, module: string, name: string,
                position: number, parentClass: string, call: string, document: TextDocument) {
        this.column = column;
        this.line = line;
        this.module = module;
        this.name = name;
        this.position = position;
        this.parentClass = parentClass;
        this.References = [];
        this.call = call;
        this.start = Position.create(this.line, this.column);
        this.end = Position.create(this.line, this.column + Number(this.name.length));
        this.range = Range.create(this.start, this.end);
        this.document = document;
    }
    public setSymbolType(type: string): void {
        switch(type) {
            case "Class": this.symbolType = SymbolType.Class; break;
            case "Method": this.symbolType = SymbolType.Method; break;
            case "Function": this.symbolType = SymbolType.Function; break;
            case "Field": this.symbolType = SymbolType.Field; break;
            case "Call": this.symbolType = SymbolType.Call; break;
            default: this.symbolType = SymbolType.Unknown; break;
        }
    }
    public setBodyEnd(endLine: number, endPos: number, endColumn: number) {
        this.endLine = endLine;
        this.endPosition = endPos;
        this.endColumn = endColumn;
        this.end = Position.create(this.endLine, this.endColumn);
        this.range = Range.create(this.start, this.end);
    }
    public isValid(): boolean {
        return !isNaN(this.column) && !isNaN(this.line) && this.name !== "" && this.name !== undefined;
    }
}
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
    constructor(column: number, line: number, position: number, methodName: string, document: TextDocument, referencedName: string) {
        this.column = column;
        this.line = line;
        this.position = position;
        this.methodName = methodName;
        this.referencedName = referencedName;
        this.start = Position.create(this.line, this.column);
        this.end = Position.create(this.line, this.column + this.referencedName.length);
        this.range = Range.create(this.start, this.end);
        this.document = document;
    }
    public isValid(): boolean {
        return !isNaN(this.column) && !isNaN(this.line) && this.methodName !== "";
    }
}

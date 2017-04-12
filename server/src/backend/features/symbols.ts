/*import {Position, Range} from "vscode-languageserver";

export enum SymbolType {
    Unknown, Class, Method, Function, Field, Call
}
export class SymbolTable {
    public symbols: Symbol[];
    public hash: number;
    constructor() {
        this.symbols = [];
    }
}
export class Symbol {
    public column: number;
    public line: number;
    public module: string;
    public name: string;
    public position: number;
    public symbolType: SymbolType;
    public parentClass: string;
    public References: Reference[];
    public start: Position;
    public end: Position;
    public range: Range;
    public call: string;

    constructor(column: number, line: number, module: string, name: string, position: number, parentClass: string, call: string) {
        this.column = column;
        this.line = line;
        this.module = module;
        this.name = name;
        this.position = position;
        this.parentClass = parentClass;
        this.References = [];
        this.call = call;
        this.start = new Position(this.line, this.column);
        this.end = new Position(this.line, this.column + Number(this.name.length));
        this.range = new Range(this.start, this.end);
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

    constructor(column: number, line: number, position: number, methodName: string) {
        this.column = column;
        this.line = line;
        this.position = position;
        this.methodName = methodName;
        this.start = new Position(this.line, this.column);
        this.end = new Position(this.line, this.column + this.methodName.length);
        this.range = new Range(this.start, this.end);
    }
    public isValid(): boolean {
        return !isNaN(this.column) && !isNaN(this.line) && this.methodName !== "";
    }
}
*/
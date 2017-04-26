import {Position, Range, TextDocument} from "vscode-languageserver";
import { DafnyKeyWords } from "./../../strings/stringRessources";
import { containsPosition } from "./../../vscodeFunctions/positionHelper";
export enum SymbolType {
    Unknown, Class, Method, Function, Field, Call, Definition
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
    public requires: string[];
    public ensures: string[];
    constructor(symbol: any, document: TextDocument) {
        this.column = adjustDafnyColumnPositionInfo(symbol.Column);
        this.line = adjustDafnyLinePositionInfo(symbol.Line);
        this.module = symbol.Module;
        this.name = symbol.Name;
        this.position = symbol.Position;
        this.parentClass = symbol.ParentClass;
        this.References = [];
        this.call = symbol.Call;
        this.start = Position.create(this.line, this.column);
        this.end = Position.create(this.line, this.column + Number(this.name.length));
        this.range = Range.create(this.start, this.end);
        this.document = document;
        this.requires = [];
        this.ensures = [];
    }
    public setSymbolType(type: string): void {
        switch(type) {
            case "Class": this.symbolType = SymbolType.Class; break;
            case "Method": this.symbolType = SymbolType.Method; break;
            case "Function": this.symbolType = SymbolType.Function; break;
            case "Field": this.symbolType = SymbolType.Field; break;
            case "Call": this.symbolType = SymbolType.Call; break;
            case "Definition": this.symbolType = SymbolType.Definition; break;
            default: this.symbolType = SymbolType.Unknown; break;
        }
    }
    public setBodyEnd(endLine: string, endPos: number, endColumn: string) {
        this.endLine = adjustDafnyLinePositionInfo(endLine);
        this.endPosition = endPos;
        this.endColumn = adjustDafnyColumnPositionInfo(endColumn);
        this.end = Position.create(this.endLine, this.endColumn);
        this.range = Range.create(this.start, this.end);
    }
    public isValid(): boolean {
        return !isNaN(this.column) && !isNaN(this.line) && this.name !== "" && this.name !== undefined;
    }
    public addEnsuresClauses(clauses: any) {
        if(clauses && clauses.length) {
            for(const clause of clauses) {
                this.ensures.push("Ensures " + clause);
            }
        }
    }
    public addRequiresClauses(clauses: any) {
        if(clauses && clauses.length) {
            for(const clause of clauses) {
                this.requires.push("Requires " + clause);
            }
        }
    }
    public needsCodeLens(): boolean {
        return !(this.name === DafnyKeyWords.DefaultModuleName && this.symbolType === SymbolType.Class) &&
                    (this.symbolType !== SymbolType.Unknown && this.symbolType !== SymbolType.Call);
    }
    public canProvideCodeCompletion(parentClass: string) {
        return this.parentClass === parentClass &&
            (this.symbolType === SymbolType.Field || this.symbolType === SymbolType.Method) &&
            this.name !== DafnyKeyWords.ConstructorMethod;
    }
    public isDefinitionFor(word: string, position: Position = null): boolean {
        if(position !== null) {
            return this.symbolType === SymbolType.Definition && this.name === word && containsPosition(this.range, position);
        } else {
            return this.symbolType === SymbolType.Definition && this.name === word;
        }
    }
    public isFuzzyDefinitionForSymbol(symbol: Symbol): boolean {
        return this.module === symbol.module && this.parentClass === symbol.parentClass
            && this.name === symbol.name && this.symbolType !== SymbolType.Call;
    }

    public isDefiningClassForPosition(position: Position): boolean {
        return this.range && this.symbolType && containsPosition(this.range, position) && this.symbolType === SymbolType.Class;
    }

    public isCompletableMemberOfClass(word: string, parentClass: string): boolean {
        return (this.symbolType === SymbolType.Call || this.symbolType === SymbolType.Field
            || this.symbolType === SymbolType.Method) && this.name.includes(word) && this.parentClass === parentClass;
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

export function adjustDafnyColumnPositionInfo(col: string): number {
    return Math.max(0, parseInt(col, 10) - 1); // 1 based, but 0 can appear in some cases
}
export function adjustDafnyLinePositionInfo(line: string): number {
    return Math.max(0, parseInt(line, 10) - 1); // 1 based
}

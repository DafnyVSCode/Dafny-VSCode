import {Position, Range, TextDocument} from "vscode-languageserver";
import { DafnyKeyWords, SymbolString } from "./../../strings/stringRessources";
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
    public referencedClass: string;
    public referencedModule: string;
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
            case SymbolString.Class: this.symbolType = SymbolType.Class; break;
            case SymbolString.Method: this.symbolType = SymbolType.Method; break;
            case SymbolString.Function: this.symbolType = SymbolType.Function; break;
            case SymbolString.Field: this.symbolType = SymbolType.Field; break;
            case SymbolString.Call: this.symbolType = SymbolType.Call; break;
            case SymbolString.Definition: this.symbolType = SymbolType.Definition; break;
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
                this.ensures.push(clause);
            }
        }
    }
    public addRequiresClauses(clauses: any) {
        if(clauses && clauses.length) {
            for(const clause of clauses) {
                this.requires.push(clause);
            }
        }
    }
    public prettyEnsures(): string[] {
        return this.ensures.map((e: string) => "Ensures " + e);
    }
    public prettyRequires(): string[] {
        return this.requires.map((e: string) => "Requires " + e);
    }
    public needsCodeLens(): boolean {
        return !(this.name === DafnyKeyWords.DefaultModuleName && this.isOfType([SymbolType.Class])) &&
                    !this.isOfType([SymbolType.Unknown, SymbolType.Call, SymbolType.Definition]);
    }
    public canProvideCodeCompletionForDefinition(symbol: Symbol) {
        return this.isDefinedInSameClass(symbol) &&
            this.isOfType([SymbolType.Field, SymbolType.Method]) &&
            this.name !== DafnyKeyWords.ConstructorMethod;
    }
    public canProvideCodeCompletionForClass(symbol: Symbol) {
        return this.hasParentClass(symbol.name) &&
            this.hasModule(symbol.module) &&
            this.isOfType([SymbolType.Field, SymbolType.Method]) &&
            this.name !== DafnyKeyWords.ConstructorMethod;
    }
    public isDefinitionFor(word: string, position: Position = null): boolean {
        return this.isTypeAt(word, SymbolType.Definition, position);

    }
    public isField(word: string, position: Position = null): boolean {
        return this.isTypeAt(word, SymbolType.Field, position);
    }
    public isDefiningClassForFieldType(symbol: Symbol): boolean {
        return this.isOfType([SymbolType.Class]) && this.hasName(symbol.referencedClass) && this.hasModule(symbol.referencedModule);
    }
    public containsPosition(uri: string, position: Position): boolean {
        return this.document.uri === uri && containsPosition(this.range, position);
    }
    public isFuzzyDefinitionForSymbol(symbol: Symbol): boolean {
        return this.isDefinedInSameClass(symbol)
            && this.hasName(symbol.name) && !this.isOfType([SymbolType.Call]);
    }

    public isDefiningClassForPosition(position: Position): boolean {
        return this.range && containsPosition(this.range, position) && this.isOfType([SymbolType.Class]);
    }

    public isCompletableMemberOfClass(word: string, parentClass: string): boolean {
        return this.isOfType([SymbolType.Call, SymbolType.Field, SymbolType.Method])
            && this.name.includes(word) && this.hasParentClass(parentClass);
    }
    private isDefinedInSameClass(symbol: Symbol): boolean {
        return this.hasParentClass(symbol.parentClass) && this.hasModule(symbol.module);
    }
    private isOfType(types: SymbolType[]): boolean {
        return types.includes(this.symbolType);
    }
    private hasParentClass(parentClass: string): boolean {
        return this.parentClass === parentClass;
    }
    private hasModule(module: string): boolean {
        return this.module === module;
    }
    private hasName(name: string): boolean {
        return this.name === name;
    }

    private isTypeAt(word: string, type: SymbolType, position: Position = null): boolean {
        const isTypeOfName = this.isOfType([type]) && this.hasName(word);
        if(position !== null) {
            return isTypeOfName && containsPosition(this.range, position);
        }
        return isTypeOfName;
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

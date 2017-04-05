"use strict";
import {Position, Range, TextDocument} from "vscode";
import {DafnyServer} from "../dafnyServer";
import { EnvironmentConfig } from "./../../Strings/stringRessources";
import { hashString } from "./../../Strings/StringUtils";
import { bubbleRejectedPromise } from "./../../Util/PromiseHelpers";

export enum SymbolType {
    Unknown, Class, Method, Function, Field
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

    constructor(column: number, line: number, module: string, name: string, position: number, parentClass: string) {
        this.column = column;
        this.line = line;
        this.module = module;
        this.name = name;
        this.position = position;
        this.parentClass = parentClass;
        this.References = [];
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
export class SymbolService {
    private symbolTable: {[fileName: string]: SymbolTable} = {};

    public constructor(public server: DafnyServer) {}

    public addSymbols(doc: TextDocument, symbols: SymbolTable, forceAddition: boolean = false): void {
        const hash = hashString(doc.getText());
        if(forceAddition) {
            this.symbolTable[doc.fileName] = symbols;
        } else {
            this.getSymbols(doc).then((sym: any) => {
                if(!sym || sym.hash !== hash) {
                    this.symbolTable[doc.fileName] = symbols;
                }
            });
        }
    }

    public getSymbols(doc: TextDocument): Promise<SymbolTable> {
        const symbols = this.symbolTable[doc.fileName];
        if(!symbols) {
            return this.getSymbolsFromDafny(doc).then((symb: SymbolTable) => {
                symb.hash = hashString(doc.getText());
                this.addSymbols(doc, symb, true);
                return Promise.resolve(symb);
            });
        } else {
            return Promise.resolve(symbols);
        }
    }

    public getSymbolsFromDafny(document: TextDocument): Promise<SymbolTable> {
        if (!document) {
            return Promise.resolve(null);
        }
        return new Promise<any>((resolve, reject) => {
                return this.askDafnyForSymbols(resolve, reject, document);
        }).then((symbols: any) => {
            return Promise.resolve(this.parseSymbols(symbols));
        }, bubbleRejectedPromise);
    }
    private parseSymbols(response: any): SymbolTable {
        const symbolTable = new SymbolTable();
        if(response && response.length && response.length > 0) {
            for(const symbol of response) {
                const line = Math.max(0, parseInt(symbol.Line, 10) - 1); // 1 based
                const column = Math.max(0, parseInt(symbol.Column, 10) - 1); // ditto, but 0 can appear in some cases
                const module = symbol.Module;
                const name = symbol.Name;
                const parentClass = symbol.ParentClass;
                const position = symbol.Position;
                const parsedSymbol = new Symbol(column, line, module, name, position, parentClass);
                if(parsedSymbol.isValid()) {
                    parsedSymbol.setSymbolType(symbol.SymbolType);
                    if(symbol.References && symbol.References.length && symbol.References.length > 0) {
                        for(const reference of symbol.References) {
                            const methodName = reference.MethodName;
                            const loc = reference.Position;
                            const referenceLine = parseInt(reference.Line, 10) - 1; // 1 based
                            const referenceColumn =
                                Math.max(0, parseInt(reference.Column, 10) - 1); // ditto, but 0 can appear in some cases
                            const parsedReference = new Reference(referenceColumn, referenceLine, loc, methodName);
                            if(parsedReference.isValid()) {
                                parsedSymbol.References.push(parsedReference);
                            }
                        }
                    }
                    symbolTable.symbols.push(parsedSymbol);
                }
            }
        }
        return symbolTable;
    }
    private askDafnyForSymbols(resolve: any, reject: any, document: TextDocument) {
        this.server.addDocument(document, "symbols", (log) =>  {
            this.handleProcessData(log, ((data) => {resolve(data); }));
        }, () => {reject(null); });
    }

    private handleProcessData(log: string, callback: (data: any) => any): void {
        if(log && log.indexOf(EnvironmentConfig.DafnySuccess) > 0
                && log.indexOf(EnvironmentConfig.DafnyFailure) < 0 && log.indexOf("SYMBOLS_START ") > -1) {
            const info = log.substring("SYMBOLS_START ".length, log.indexOf(" SYMBOLS_END"));
            const json = this.getResponseAsJson(info);
            callback(json);
        }
    }

    private getResponseAsJson(info: string) {
        try {
            return JSON.parse(info);
        } catch(exception) {
            console.error("Failure  to parse response: " + exception);
            return null;
        }
    }
}

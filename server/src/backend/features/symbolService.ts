"use strict";
import {TextDocument} from "vscode-languageserver";
import {DafnyServer} from "../dafnyServer";
import { EnvironmentConfig } from "./../../strings/stringRessources";
import { hashString } from "./../../strings/stringUtils";
import { bubbleRejectedPromise } from "./../../util/promiseHelpers";
import { Reference, Symbol, SymbolTable, SymbolType } from "./symbols";
export class SymbolService {
    private symbolTable: {[fileName: string]: SymbolTable} = {};

    public constructor(public server: DafnyServer) {}

    public addSymbols(doc: TextDocument, symbols: SymbolTable, forceAddition: boolean = false): void {
        const hash = hashString(doc.getText());
        if(forceAddition) {
            this.symbolTable[doc.uri] = symbols;
        } else {
            this.getSymbols(doc).then((sym: any) => {
                if(!sym || sym.hash !== hash) {
                    this.symbolTable[doc.uri] = symbols;
                }
            });
        }
    }

    public getSymbols(doc: TextDocument): Promise<SymbolTable[]> {
        const hash = hashString(doc.getText());
        const symbolTables: SymbolTable[] = [];
        for(const key in this.symbolTable) {
            if(key !== doc.uri) {
                symbolTables.push(this.symbolTable[key]);
            }
        }
        const symbols = this.symbolTable[doc.uri];
        if(!symbols || hash !== symbols.hash) {
            return this.getSymbolsFromDafny(doc).then((symb: SymbolTable) => {
                symb.hash = hashString(doc.getText());
                this.addSymbols(doc, symb, true);
                symbolTables.push(symb);
                return Promise.resolve(symbolTables);
            });
        } else {
            symbolTables.push(symbols);
            return Promise.resolve(symbolTables);
        }
    }

    public getSymbolsFromDafny(document: TextDocument): Promise<SymbolTable> {
        if (!document) {
            return Promise.resolve(null);
        }
        return new Promise<any>((resolve, reject) => {
                return this.askDafnyForSymbols(resolve, reject, document);
        }).then((symbols: any) => {
            return Promise.resolve(this.parseSymbols(symbols, document));
        }, bubbleRejectedPromise);
    }
    private parseSymbols(response: any, document: TextDocument): SymbolTable {
        const symbolTable = new SymbolTable(document.uri);
        if(response && response.length && response.length > 0) {
            for(const symbol of response) {
                const parsedSymbol = this.parseSymbol(symbol, document);
                if(parsedSymbol.isValid()) {
                    symbolTable.symbols.push(parsedSymbol);
                }
            }
        }
        return symbolTable;
    }
    private parseSymbol(symbol: any, document: TextDocument): Symbol {
        const line = this.adjustDafnyLinePositionInfo(symbol.Line);
        const column = this.adjustDafnyColumnPositionInfo(symbol.Column);
        const mod = symbol.Module;
        const name = symbol.Name;
        const parentClass = symbol.ParentClass;
        const position = symbol.Position;
        const call = symbol.Call;
        const parsedSymbol = new Symbol(column, line, mod, name, position, parentClass, call, document);
        if(parsedSymbol.isValid()) {
            parsedSymbol.setSymbolType(symbol.SymbolType);
            if(parsedSymbol.symbolType === SymbolType.Class) {
                parsedSymbol.setBodyEnd(
                    this.adjustDafnyLinePositionInfo(symbol.EndLine),
                    symbol.EndPosition,
                    this.adjustDafnyColumnPositionInfo(symbol.EndColumn));
            }
            if(symbol.References && symbol.References.length && symbol.References.length > 0) {
                for(const reference of symbol.References) {
                    const parsedReference = this.parseReference(reference, document);
                    if(parsedReference.isValid()) {
                        parsedSymbol.References.push(parsedReference);
                    }
                }
            }
        }
        return parsedSymbol;
    }
    private parseReference(reference: any, document: TextDocument): Reference {
        const methodName = reference.MethodName;
        const loc = reference.Position;
        const referenceLine = this.adjustDafnyLinePositionInfo(reference.Line);
        const referenceColumn = this.adjustDafnyColumnPositionInfo(reference.Column);
        return new Reference(referenceColumn, referenceLine, loc, methodName, document);
    }
    private askDafnyForSymbols(resolve: any, reject: any, document: TextDocument) {
        this.server.addDocument(document, "symbols", (log) =>  {
            this.handleProcessData(log, ((data) => {resolve(data); }));
        }, () => {reject(null); });
    }

    private handleProcessData(log: string, callback: (data: any) => any): void {
        if(log && log.indexOf(EnvironmentConfig.DafnySuccess) > 0
                && log.indexOf(EnvironmentConfig.DafnyFailure) < 0 && log.indexOf("SYMBOLS_START ") > -1) {
            const info = log.substring(log.indexOf("SYMBOLS_START ") + "SYMBOLS_START ".length, log.indexOf(" SYMBOLS_END"));
            const json = this.getResponseAsJson(info);
            callback(json);
        }
    }
    private adjustDafnyColumnPositionInfo(col: string): number {
        return Math.max(0, parseInt(col, 10) - 1); // 1 based, but 0 can appear in some cases
    }
    private adjustDafnyLinePositionInfo(line: string): number {
        return Math.max(0, parseInt(line, 10) - 1); // 1 based
    }
    private getResponseAsJson(info: string) {
        try {
            return JSON.parse(info);
        } catch(exception) {
            console.error("Failure  to parse response: " + exception + ", json: " + info);
            return null;
        }
    }
}

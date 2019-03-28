"use strict";
import {TextDocument} from "vscode-languageserver";
import {DafnyServer} from "../dafnyServer";
import { DafnyVerbs, EnvironmentConfig } from "./../../strings/stringRessources";
import { hashString } from "./../../strings/stringUtils";
import { Reference } from "./Reference";
import { DafnySymbol, SymbolType } from "./symbols";
import { SymbolTable } from "./SymbolTable";
export class SymbolService {
    private symbolTable: {[fileName: string]: SymbolTable} = {};
    private documentTable: {[fileName: string]: TextDocument} = {};

    public constructor(public server: DafnyServer) {}

    public addSymbols(doc: TextDocument, symbols: SymbolTable, forceAddition: boolean = false): void {
        const hash = hashString(doc.getText());
        if (forceAddition && symbols.symbols.length > 0) {
            this.symbolTable[doc.uri] = symbols;
            this.documentTable[doc.uri] = doc;
        } else {
            this.getSymbols(doc).then((sym: any) => {
                if (symbols.symbols.length > 0 && (!sym || sym.hash !== hash)) {
                    this.symbolTable[doc.uri] = symbols;
                    this.documentTable[doc.uri] = doc;
                }
            });
        }
    }

    public getTextDocument(uri: string): TextDocument {
        return this.documentTable[uri];
    }

    public getSymbols(doc: TextDocument, forceOld: boolean = false): Promise<SymbolTable[]> {
        const hash = hashString(doc.getText());
        const symbolTables = this.getAllCachedExcept(doc.uri);
        const symbols = this.symbolTable[doc.uri];
        if (!symbols || (!forceOld && hash !== symbols.hash)) {
            return this.loadSymbols(doc, symbolTables, symbols);
        } else {
            symbolTables.push(symbols);
            return Promise.resolve(symbolTables);
        }
    }
    public async getAllSymbols(document: TextDocument): Promise<DafnySymbol[]> {
        const tables = await this.getSymbols(document, true);
        return ([] as DafnySymbol[]).concat.apply([], tables.map((table: SymbolTable) => table.symbols));
    }

    public async getSymbolsFromDafny(document: TextDocument): Promise<SymbolTable> {
        if (!document) {
            return Promise.reject("No document to create symbol table from.");
        }
        try {
            const symbols = await this.askDafnyForSymbols(document);
            return this.parseSymbols(symbols, document);
        } catch (err) {
            console.error(err);
            return Promise.reject(`Could not create Dafny symbol table (Error: ${err})`);
        }
    }

    private getAllCachedExcept(uri: string): SymbolTable[] {
        const symbolTables: SymbolTable[] = [];
        for (const key in this.symbolTable) {
            if (key !== uri) {
                symbolTables.push(this.symbolTable[key]);
            }
        }
        return symbolTables;
    }
    private async loadSymbols(doc: TextDocument, symbolTables: SymbolTable[], symbols: SymbolTable): Promise<SymbolTable[]> {
        const symb = await this.getSymbolsFromDafny(doc);
        if (symb.symbols.length > 0) {
            symb.hash = hashString(doc.getText());
            this.addSymbols(doc, symb, true);
            symbolTables.push(symb);
        } else if (symbols) {
            symbolTables.push(symbols);
        }
        return Promise.resolve(symbolTables);
    }
    private parseSymbols(response: any, document: TextDocument): SymbolTable {
        const symbolTable = new SymbolTable(document.uri);
        if (response && response.length && response.length > 0) {
            for (const symbol of response) {
                const parsedSymbol = this.parseSymbol(symbol, document);
                if (parsedSymbol.isValid()) {
                    symbolTable.symbols.push(parsedSymbol);
                }
            }
        }
        return symbolTable;
    }
    private parseSymbol(symbol: any, document: TextDocument): DafnySymbol {
        let parsedSymbol = new DafnySymbol(symbol, document);
        if (parsedSymbol.isValid()) {
            parsedSymbol.setSymbolType(symbol.SymbolType);
            if (parsedSymbol.isOfType(
                                    [SymbolType.Class, SymbolType.Definition, SymbolType.Method,
                                    SymbolType.Function, SymbolType.Predicate])
            ) {
                parsedSymbol.setBodyEnd(symbol.EndLine, symbol.EndPosition, symbol.EndColumn);
            }
            if (parsedSymbol.symbolType ===  SymbolType.Method) {
                parsedSymbol.addEnsuresClauses(symbol.Ensures);
                parsedSymbol.addRequiresClauses(symbol.Requires);
            }
            if (parsedSymbol.symbolType === SymbolType.Field) {
                parsedSymbol.referencedClass = symbol.ReferencedClass;
                parsedSymbol.referencedModule = symbol.ReferencedModule;
            }
            parsedSymbol = this.parseReferences(symbol, parsedSymbol, document);
        }
        return parsedSymbol;
    }

    private parseReferences(symbol: any, parsedSymbol: DafnySymbol, document: TextDocument): DafnySymbol {
        if (symbol.References && symbol.References.length && symbol.References.length > 0) {
            for (const reference of symbol.References) {
                const parsedReference = new Reference(reference, document);
                if (parsedReference.isValid()) {
                    parsedSymbol.References.push(parsedReference);
                }
            }
        }
        return parsedSymbol;
    }
    private askDafnyForSymbols(document: TextDocument): Promise<any> {
        return new Promise((resolve, reject) => {
            this.server.addDocument(
                document,
                DafnyVerbs.Symbols,
                (response: string) => this.handleProcessData(response, resolve),
                () => reject(`Error while requesting symbols from dafny for document "${document.uri}"`),
            );
        });
    }

    private handleProcessData(response: string, callback: (data: any) => void): void {
        if (response && response.indexOf(EnvironmentConfig.DafnySuccess) > 0
                && response.indexOf(EnvironmentConfig.DafnyFailure) < 0 && response.indexOf(EnvironmentConfig.SymbolStart) > -1) {
            const startOfSymbols: number = response.indexOf(EnvironmentConfig.SymbolStart) + EnvironmentConfig.SymbolStart.length;
            const endOfSymbols: number = response.indexOf(EnvironmentConfig.SymbolEnd);
            const info: string = response.substring(startOfSymbols, endOfSymbols);
            const json = this.getResponseAsJson(info);
            callback(json);
        }
    }
    private getResponseAsJson(info: string): any {
        try {
            return JSON.parse(info);
        } catch (exception) {
            console.error("Failure  to parse response: " + exception + ", json: " + info);
            return null;
        }
    }
}

"use strict";
import * as vscode from "vscode-languageserver";
import { DocumentDecorator } from "../../vscodeFunctions/documentDecorator";
import { DafnyServer } from "../dafnyServer";
import { Symbol, SymbolTable, SymbolType } from "./symbols";

export class DafnyDefinitionInformtation {
    public filePath: string;
    public symbol: Symbol;
    constructor(symbol: Symbol) {
        this.symbol = symbol;
        this.filePath = symbol.document.uri;
    }
}

export class DafnyDefinitionProvider {

    public constructor(public server: DafnyServer) { }

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position):
        Thenable<vscode.Location> {
        return this.provideDefinitionInternal(document, position).then((definitionInfo: DafnyDefinitionInformtation) => {
            if (definitionInfo == null || definitionInfo.symbol == null) {
                return null;
            }
            return vscode.Location.create(definitionInfo.filePath, definitionInfo.symbol.range);
        }, (err) => {
            console.error(err);
            return null;
        });
    }

    public provideDefinitionInternal(document: vscode.TextDocument, position: vscode.Position): Promise<DafnyDefinitionInformtation> {
        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        if(documentDecorator.isMethodCall(position)) {
            return this.findExactDefinition(position, documentDecorator);
        }
        return this.findPossibleDefinition(position, documentDecorator);
    }
    private findPossibleDefinition(position: vscode.Position, documentDecorator: DocumentDecorator): Promise<DafnyDefinitionInformtation> {
        const word = documentDecorator.getValidIdentifierOrNull(position);
        if(!word) {
            return null;
        }
        return this.findDefinition(documentDecorator.document, word);
    }

    private findExactDefinition(position: vscode.Position, documentDecorator: DocumentDecorator): Promise<DafnyDefinitionInformtation>  {
            const call = documentDecorator.getFullyQualifiedNameOfCalledMethod(position);
            return this.server.symbolService.getSymbols(documentDecorator.document).then((symbolTables: SymbolTable[]) => {
                for(const symbolTable of symbolTables) {
                    for(const symb of symbolTable.symbols.filter((s: Symbol) => s.symbolType === SymbolType.Call && s.call === call)) {
                        const definitionSymbol = symbolTable.symbols.find((s: Symbol) => s.isFuzzyDefinitionForSymbol(symb));
                        if(definitionSymbol) {
                            return new DafnyDefinitionInformtation(definitionSymbol);
                        }
                    }
                }
                return null;
            }).catch((err: any) => err);
    }
    private findDefinition(document: vscode.TextDocument, symbolName: string): Promise<DafnyDefinitionInformtation> {
        return this.server.symbolService.getAllSymbols(document).then((symbols: Symbol[]) => {
            const definingSymbol = symbols.find((symbol: Symbol) => symbol.name === symbolName);
            if(definingSymbol) {
                return new DafnyDefinitionInformtation(definingSymbol);
            }
            return null;
        }).catch((err: any) => err);
    }
}

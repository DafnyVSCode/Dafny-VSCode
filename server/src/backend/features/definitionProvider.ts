"use strict";
import { DocumentDecorator } from "./../../vscodeFunctions/documentDecorator";

import * as vscode from "vscode-languageserver";
import { DocumentDecorator } from "../../vscodeFunctions/documentDecorator";
import { translate } from "../../vscodeFunctions/positionHelper";
import { DafnyServer } from "../dafnyServer";
import { dafnyKeywords } from "./../../languageDefinition/keywords";
import { EnvironmentConfig } from "./../../strings/stringRessources";
import { isPositionInString } from "./../../strings/stringUtils";
import { Symbol, SymbolTable, SymbolType } from "./symbols";

export class DafnyDefinitionInformtation {
    public filePath: string;
    public symbol: Symbol;
    constructor(symbol: Symbol, filePath: string) {
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

    public provideDefinitionInternal(
        document: vscode.TextDocument, position: vscode.Position): Promise<DafnyDefinitionInformtation> {
        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        if(documentDecorator.isMethodCall(position)) {
            return this.findExactDefinition(document, position, documentDecorator);
        }
        const lineText = documentDecorator.lineAt(position);
        const wordRange = documentDecorator.getWordRangeAtPosition(position);
        const word = wordRange ? documentDecorator.getText(wordRange) : "";
        if (!wordRange || lineText.startsWith("//") || isPositionInString(document, position)
            || word.match(/^\d+.?\d+$/) || dafnyKeywords.indexOf(word) > 0) {
            return null;
        }
        return this.findDefinition(document, word);
    }

    private findExactDefinition(document: vscode.TextDocument, position: vscode.Position,
                                documentDecorator: DocumentDecorator): Promise<DafnyDefinitionInformtation>  {
            return this.server.symbolService.getSymbols(document).then((symbolTables: SymbolTable[]) => {
                const call = documentDecorator.getFullyQualifiedNameOfCalledMethod(position);
                for(const symbolTable of symbolTables) {
                    for(const symb of symbolTable.symbols.filter((s: Symbol) => s.symbolType === SymbolType.Call)) {
                        if(symb.call === call) {
                            const definitionSymbol = symbolTable.symbols.find((s: Symbol) => { return s.module === symb.module &&
                                s.parentClass === symb.parentClass && s.name === symb.name && s.symbolType !== SymbolType.Call; });
                            if(definitionSymbol) {
                                return new DafnyDefinitionInformtation(definitionSymbol, symbolTable.fileName);
                            }
                            return null;
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
                return new DafnyDefinitionInformtation(definingSymbol, definingSymbol.document.uri);
            }
            return null;
        }).catch((err: any) => err);
    }
}

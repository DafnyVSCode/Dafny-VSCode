"use strict";

import * as vscode from "vscode-languageserver";
import { DocumentDecorator } from "../../vscodeFunctions/documentDecorator";
import { translate } from "../../vscodeFunctions/positionHelper";
import { DafnyServer } from "../dafnyServer";
import { dafnyKeywords } from "./../../languageDefinition/keywords";
import { EnvironmentConfig } from "./../../strings/stringRessources";
import { isPositionInString } from "./../../strings/stringUtils";
import { Symbol, SymbolTable, SymbolType } from "./symbols";

export const DAFNYMODE: vscode.DocumentFilter = { language: EnvironmentConfig.Dafny, scheme: "file" };
export class DafnyDefinitionInformtation {
    public filePath: string;
    public symbol: Symbol;
    constructor(symbol: Symbol, filePath: string) {
        this.symbol = symbol;
        this.filePath = filePath;
    }
}

export class DafnyDefinitionProvider {

    public constructor(public server: DafnyServer) { }

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position):
        Thenable<vscode.Location> {
        return this.provideDefinitionInternal(document, position).then((definitionInfo: DafnyDefinitionInformtation) => {
            if (definitionInfo == null || definitionInfo.filePath == null) {
                return null;
            }
            const definitionResource = definitionInfo.filePath;
            return vscode.Location.create(definitionResource, definitionInfo.symbol.range);
        }, (err) => {
            console.error(err);
            return null;
        });
    }

    public provideDefinitionInternal(
        document: vscode.TextDocument, position: vscode.Position): Promise<DafnyDefinitionInformtation> {
        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        const wordRange = documentDecorator.getWordRangeAtPosition(position);
        if(this.isMethodCall(document, position)) {
            return this.server.symbolService.getSymbols(document).then((symbolTables: SymbolTable[]) => {
                const call = this.getFullyQualifiedNameOfCalledMethod(document, position);
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
        const lineText = documentDecorator.lineAt(position);
        const word = wordRange ? documentDecorator.getText(wordRange) : "";
        if (!wordRange || lineText.startsWith("//") || isPositionInString(document, position)
            || word.match(/^\d+.?\d+$/) || dafnyKeywords.indexOf(word) > 0) {
            return null;
        }
        return this.findDefinition(document, word);
    }

    private getFullyQualifiedNameOfCalledMethod(document: vscode.TextDocument, position: vscode.Position): string {
        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        const wordRange = documentDecorator.getWordRangeAtPosition(position);
        const wordRangeBeforeIdentifier = documentDecorator.getWordRangeAtPosition(translate(wordRange.start, 0, -1));

        const call = documentDecorator.getText(wordRange);
        const designator = documentDecorator.getText(wordRangeBeforeIdentifier);
        return designator + "." + call;
    }

    private isMethodCall(document: vscode.TextDocument, position: vscode.Position): boolean {
        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        const wordRange = documentDecorator.getWordRangeAtPosition(position);
        if (!wordRange) {
            return false;
        }
        const wordRangeBeforeIdentifier = documentDecorator.getWordRangeAtPosition(translate(wordRange.start, 0, -1));
        if (!wordRangeBeforeIdentifier) {
            return false;
        }
        const seperator = documentDecorator.getText(vscode.Range.create(wordRangeBeforeIdentifier.end, wordRange.start));
        if (!seperator) {
            return false;
        }
        // matches if a point is between the identifer and the word before it -> its a method call
        const match = seperator.match(/\w*\.\w*/);
        return match && match.length > 0;
    }
    private findDefinition(document: vscode.TextDocument, symbolName: string): Promise<DafnyDefinitionInformtation> {
        return this.server.symbolService.getSymbols(document).then((symbolTables: SymbolTable[]) => {
            for(const symbolTable of symbolTables) {
                for (const symb of symbolTable.symbols) {
                    if (symb.name === symbolName) {
                        return new DafnyDefinitionInformtation(symb, symbolTable.fileName);
                    }
                }
            }
            return null;
        }).catch((err: any) => err);
    }
}

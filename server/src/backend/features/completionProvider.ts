"use strict";
import { CompletionItem, CompletionItemKind } from "vscode-languageserver-types/lib/main";
import { TextDocumentPositionParams } from "vscode-languageserver/lib/protocol";
import { DocumentDecorator } from "./../../vscodeFunctions/documentDecorator";
import { containsPosition } from "./../../vscodeFunctions/positionHelper";
import { DafnyServer } from "./../dafnyServer";
import { Reference } from "./symbols";
import {Symbol, SymbolTable, SymbolType } from "./symbols";
export class DafnyCompletionProvider {
    public constructor(public server: DafnyServer) { }

    public provideCompletion(handler: TextDocumentPositionParams): Promise<CompletionItem[]> {
        console.log("Helloooo");
        const document =  this.server.symbolService.getTextDocument(handler.textDocument.uri);
        console.log(document);

        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        const wordRange = documentDecorator.matchWordRangeAtPosition(handler.position);
        const word = wordRange ? documentDecorator.getText(wordRange).replace(".", "") : "";
        console.log(word);
        return this.server.symbolService.getSymbols(document, true).then((tables: SymbolTable[]) => {
            const allSymbols = [].concat.apply([], tables.map((table: SymbolTable) => table.symbols));
            console.log(allSymbols);
            const  definition: Symbol = allSymbols.find((e: Symbol) => {
                return e.symbolType === SymbolType.Definition && e.name === word && containsPosition(e.range, handler.position);
            });
            if(definition) {
                const possibleSymbolForCompletion: Symbol[] = allSymbols.filter((e: Symbol) => {
                    return e.parentClass === definition.parentClass &&
                        (e.symbolType === SymbolType.Field || e.symbolType === SymbolType.Method) &&
                        e.name !== "_ctor";
                });
                return possibleSymbolForCompletion.map((e: Symbol) => {
                    const completionItem = CompletionItem.create(e.name);
                    if(e.symbolType === SymbolType.Field) {
                        completionItem.kind = CompletionItemKind.Field;
                    } else if(e.symbolType === SymbolType.Method) {
                        completionItem.kind = CompletionItemKind.Method;
                        completionItem.label += "()";
                    }
                    return completionItem;
                });
            } else {
                return [];
            }
        });
    }
}

"use strict";
import {EOL} from "os";
import { CompletionItem, CompletionItemKind, Position, TextDocument } from "vscode-languageserver-types/lib/main";
import { TextDocumentPositionParams } from "vscode-languageserver/lib/protocol";
import { DocumentDecorator } from "./../../vscodeFunctions/documentDecorator";
import { DafnyServer } from "./../dafnyServer";
import {Symbol, SymbolType } from "./symbols";
export class DafnyCompletionProvider {
    public constructor(public server: DafnyServer) { }

    public provideCompletion(handler: TextDocumentPositionParams): Promise<CompletionItem[]> {
        const document =  this.server.symbolService.getTextDocument(handler.textDocument.uri);
        const word = this.parseWordForCompletion(document, handler.position);
        return this.server.symbolService.getAllSymbols(document).then((allSymbols: Symbol[]) => {
            const  definition: Symbol = allSymbols.find((e: Symbol) => e.isDefinitionFor(word));
            if(definition) {
                const possibleSymbolForCompletion: Symbol[] = allSymbols.filter(
                    (symbol: Symbol) => symbol.canProvideCodeCompletionForDefinition(definition));
                return possibleSymbolForCompletion.map((e: Symbol) => this.buildCompletion(e));
            } else {
                const fields: Symbol[] = allSymbols.filter((e: Symbol) => e.isField(word));
                const definingClass: Symbol = allSymbols.find((e: Symbol) => {
                    for(const field of fields) {
                        if(e.isDefiningClassForFieldType(field)) {
                            return true;
                        }
                        return false;
                    }
                });
                if(definingClass) {
                    const possibleSymbolForCompletion: Symbol[] = allSymbols.filter(
                        (symbol: Symbol) => symbol.canProvideCodeCompletionForClass(definingClass));
                    return possibleSymbolForCompletion.map((e: Symbol) => this.buildCompletion(e));
                }
            }
            return [];
        });
    }
    private parseWordForCompletion(document: TextDocument, position: Position): string {
        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        const wordRange = documentDecorator.matchWordRangeAtPosition(position);
        return wordRange ? documentDecorator.getText(wordRange).replace(".", "") : "";
    }

    private buildCompletion(symbol: Symbol): CompletionItem {
        const completionItem = CompletionItem.create(symbol.name);
        if(symbol.symbolType === SymbolType.Field) {
            completionItem.kind = CompletionItemKind.Field;
        } else if(symbol.symbolType === SymbolType.Method) {
            completionItem.kind = CompletionItemKind.Method;
            completionItem.label += "()";
            completionItem.detail = symbol.prettyRequires().join(EOL);
        }
        return completionItem;
    }
}

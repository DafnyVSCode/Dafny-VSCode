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
                return this.provideExactCompletions(allSymbols, definition);
            }
            return this.provideBestEffortCompletion(allSymbols, word);
        });
    }

    private provideExactCompletions(symbols: Symbol[], definition: Symbol): CompletionItem[] {
        const possibleSymbolForCompletion: Symbol[] = symbols.filter(
                    (symbol: Symbol) => symbol.canProvideCodeCompletionForDefinition(definition));
        return possibleSymbolForCompletion.map((e: Symbol) => this.buildCompletion(e));
    }

    private provideBestEffortCompletion(symbols: Symbol[], word: string): CompletionItem[] {
        const fields: Symbol[] = symbols.filter((e: Symbol) => e.isField(word));
        const definingClass: Symbol = this.findDefiningClassForField(symbols, fields);
        if(definingClass) {
            const possibleSymbolForCompletion: Symbol[] = symbols.filter(
                (symbol: Symbol) => symbol.canProvideCodeCompletionForClass(definingClass));
            return possibleSymbolForCompletion.map((e: Symbol) => this.buildCompletion(e));
        }
        return [];
    }

    private findDefiningClassForField(symbols: Symbol[], fields: Symbol[]): Symbol {
        return symbols.find((e: Symbol) => {
            for(const field of fields) {
                if(e.isDefiningClassForFieldType(field)) {
                    return true;
                }
                return false;
            }
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

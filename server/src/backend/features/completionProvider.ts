"use strict";
import {EOL} from "os";
import { TextDocumentPositionParams } from "vscode-languageserver-protocol";
import { CompletionItem, CompletionItemKind, Position, TextDocument } from "vscode-languageserver-types/lib/main";
import { DocumentDecorator } from "./../../vscodeFunctions/documentDecorator";
import { DafnyServer } from "./../dafnyServer";
import {DafnySymbol, SymbolType } from "./symbols";
export class DafnyCompletionProvider {
    public constructor(public server: DafnyServer) { }

    public async provideCompletion(handler: TextDocumentPositionParams): Promise<CompletionItem[]> {
        const document =  this.server.symbolService.getTextDocument(handler.textDocument.uri);
        const word = this.parseWordForCompletion(document, handler.position);
        const allSymbols = await this.server.symbolService.getAllSymbols(document);
        const definition = allSymbols.find((e) => e.isDefinitionFor(word));

        if (definition) {
            return this.provideExactCompletions(allSymbols, definition);
        }
        return this.provideBestEffortCompletion(allSymbols, word);
    }

    private provideExactCompletions(symbols: DafnySymbol[], definition: DafnySymbol): CompletionItem[] {
        const possibleSymbolForCompletion: DafnySymbol[] = symbols.filter(
                    (symbol: DafnySymbol) => symbol.canProvideCodeCompletionForDefinition(definition));
        return possibleSymbolForCompletion.map((e: DafnySymbol) => this.buildCompletion(e));
    }

    private provideBestEffortCompletion(symbols: DafnySymbol[], word: string): CompletionItem[] {
        const fields: DafnySymbol[] = symbols.filter((e: DafnySymbol) => e.isField(word));
        const definingClass = this.findDefiningClassForField(symbols, fields);
        if (definingClass) {
            const possibleSymbolForCompletion: DafnySymbol[] = symbols.filter(
                (symbol: DafnySymbol) => symbol.canProvideCodeCompletionForClass(definingClass));
            return possibleSymbolForCompletion.map((e: DafnySymbol) => this.buildCompletion(e));
        }
        return [];
    }

    private findDefiningClassForField(symbols: DafnySymbol[], fields: DafnySymbol[]): DafnySymbol | undefined {
        return symbols.find((e: DafnySymbol) => {
            for (const field of fields) {
                if (e.isDefiningClassForFieldType(field)) {
                    return true;
                }
            }
            return false;
        });
    }
    private parseWordForCompletion(document: TextDocument, position: Position): string {
        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        const wordRange = documentDecorator.matchWordRangeAtPosition(position);
        return wordRange ? documentDecorator.getText(wordRange).replace(".", "") : "";
    }

    private buildCompletion(symbol: DafnySymbol): CompletionItem {
        const completionItem = CompletionItem.create(symbol.name);
        if (symbol.symbolType === SymbolType.Field) {
            completionItem.kind = CompletionItemKind.Field;
        } else if (symbol.symbolType === SymbolType.Method) {
            completionItem.kind = CompletionItemKind.Method;
            completionItem.label += "()";
            completionItem.detail = symbol.prettyRequires().join(EOL);
        }
        return completionItem;
    }
}

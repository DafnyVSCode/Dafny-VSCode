import {EOL} from "os";
import {Command} from "vscode-languageserver";
import { Position, TextEdit} from "vscode-languageserver-types/lib/main";
import { Commands, DafnyKeyWords, DafnyReports } from "./../../../strings/stringRessources";
import { methodAt } from "./../semanticAnalysis";
import { DafnySymbol } from "./../symbols";
import { BaseCommandGenerator } from "./baseCommandGenerator";

export class GuardCommandGenerator extends BaseCommandGenerator {

    protected calculateCommands(): Promise<Command[]> {
        return this.server.symbolService.getAllSymbols(this.doc).then((symbols: DafnySymbol[]) => {
            for (const guardKeyWord of DafnyKeyWords.GuardKeyWords) {
                this.addGuards(guardKeyWord, symbols);
            }
            return this.commands;
        }).catch((err: Error) => {
            console.error(err);
            return Promise.resolve([]);
        });
    }

    protected findBestEffortInsertPosition(): Position | null {
        if (!this.documentDecorator) {
            throw new Error("Document Decorator was not available to find best effort insert position");
        }
        return this.documentDecorator.tryFindBeginOfBlock(this.diagnostic.range.start);
    }

    protected findExactInsertPosition(definingMethod: DafnySymbol): Position {
        if (!this.documentDecorator) {
            throw new Error("Document Decorator was not available to find insert position");
        }
        return this.documentDecorator.findInsertionPointOfContract(definingMethod.start, this.diagnostic.range.start);
    }
    private addGuards(guardKeyWord: string, symbols: DafnySymbol[]): void {
        const message = this.diagnostic.message;
        if (message.indexOf(guardKeyWord) < 0 || message.startsWith(DafnyReports.UnresolvedDecreaseWarning)) {
            return;
        }
        const definingMethod = methodAt(symbols, this.diagnostic.range);
        if (!definingMethod) {
            throw new Error(`Could not find defining method to add guard ${guardKeyWord}`);
        }

        const guardedExpression = this.parseGuardedExpression(guardKeyWord);
        const insertPosition: Position = this.findInsertionPosition(definingMethod);
        if (insertPosition && insertPosition !== this.dummyPosition) {
            this.addGuardCommand(insertPosition, guardKeyWord, guardedExpression, this.uri);
        }
    }

    private addGuardCommand(insertPosition: Position, guardKeyWord: string, guardedExpression: string, uri: string): void {
        const guard = guardKeyWord + " " + guardedExpression;
        const edit = TextEdit.insert(insertPosition, " " + guard + EOL);
        const command = Command.create(`Add guard: ${guard}`,
            Commands.EditTextCommand, uri,
            this.dummyDocId, [edit]);
        this.commands.push(command);
    }

    private parseGuardedExpression(guardKeyword: string): string {
        const message = this.diagnostic.message;
        const lastIndexOfGuardKeyword = message.lastIndexOf(guardKeyword);
        return message.substr(lastIndexOfGuardKeyword + guardKeyword.length);
    }
}

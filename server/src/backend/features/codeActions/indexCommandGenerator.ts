import { EOL } from "os";
import { Command, Diagnostic } from "vscode-languageserver";
import { Position, TextDocument, TextEdit } from "vscode-languageserver-types/lib/main";
import { Commands, DafnyReports } from "./../../../strings/stringRessources";
import { DafnyServer } from "./../../dafnyServer";
import { methodAt } from "./../semanticAnalysis";
import { SymbolType } from "./../symbols";
import { Symbol } from "./../symbols";
import { BaseCommandGenerator } from "./baseCommandGenerator";

export class IndexCommandGenerator extends BaseCommandGenerator {

    protected calculateCommands(): Promise<Command[]> {
        if (this.diagnostic.message === DafnyReports.IndexBounding) {
            const arrayExprRange = this.documentDecorator.readArrayExpression(this.diagnostic.range.start);
            const arrExpression = this.documentDecorator.getText(arrayExprRange);
            const arrIdentifier = this.documentDecorator.parseArrayIdentifier(Position.create(arrayExprRange.start.line,
                arrayExprRange.start.character));
            if (arrExpression !== "" && arrIdentifier !== "") {
                return this.server.symbolService.getAllSymbols(this.doc).then((symbols: Symbol[]) => {
                    const definingMethod = methodAt(symbols, this.diagnostic.range);
                    const insertPosition: Position = this.findIndexInsertionPoint(definingMethod);
                    if (insertPosition && insertPosition !== this.dummyPosition) {
                        const methodStart = this.documentDecorator.findBeginOfContractsOfMethod(definingMethod.start);
                        if (definingMethod && insertPosition !== methodStart) {
                            this.addInvariantCommand(insertPosition, arrExpression, arrIdentifier);
                        } else {
                            this.addBoundCheckCommand(insertPosition, arrExpression, arrIdentifier);
                        }
                    }
                    return Promise.resolve(this.commands);
                }).catch((err: Error) => { console.error(err); return Promise.resolve([]); });
            }
        }
        return Promise.resolve(this.commands);
    }

    private findIndexInsertionPoint(definingMethod: Symbol): Position {
        let insertPosition: Position = this.dummyPosition;
        if (definingMethod) {
            insertPosition = this.documentDecorator.findInsertionPointOfContract(definingMethod.start);
        }
        if (!insertPosition || insertPosition === this.dummyPosition) {
            insertPosition = this.documentDecorator.tryFindBeginOfBlock(this.diagnostic.range.start);
        }
        return insertPosition;
    }

    private addInvariantCommand(insertPosition: Position, arrExpression: string, arrIdentifier: string): void {
        const invariantMessage = "invariant 0 <= " + arrExpression + " < " + arrIdentifier + ".Length";
        const edit = TextEdit.insert(insertPosition, " " + invariantMessage + EOL);
        this.commands.push(Command.create(`Add invariant: ${invariantMessage}`,
            Commands.EditTextCommand, this.uri,
            this.dummyDocId, [edit]));
    }

    private addBoundCheckCommand(insertPosition: Position, arrExpression: string, arrIdentifier: string): void {
        const lowerBoundMessage = "requires " + arrExpression + " >= 0\n";
        const upperBoundMessage = "requires " + arrExpression + " < " + arrIdentifier + ".Length";
        const editLower = TextEdit.insert(insertPosition, " " + lowerBoundMessage + EOL);
        const editHigher = TextEdit.insert(insertPosition, " " + upperBoundMessage + EOL);
        this.commands.push(Command.create(`Add bound checks: ${lowerBoundMessage} and ${upperBoundMessage}`,
            Commands.EditTextCommand, this.uri,
            this.dummyDocId, [editLower, editHigher]));
    }
}

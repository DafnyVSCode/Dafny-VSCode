import { EOL } from "os";
import { Command } from "vscode-languageserver";
import { Position, TextEdit } from "vscode-languageserver-types/lib/main";
import { Commands, DafnyReports } from "./../../../strings/stringRessources";
import { methodAt } from "./../semanticAnalysis";
import { DafnySymbol } from "./../symbols";
import { ArrayInformation } from "./ArrayInformation";
import { BaseCommandGenerator } from "./baseCommandGenerator";

export class IndexCommandGenerator extends BaseCommandGenerator {

    protected async calculateCommands(): Promise<Command[]> {
        if (this.diagnostic.message === DafnyReports.IndexBounding) {
            if (!this.documentDecorator) {
                throw new Error("The document decorator was not available when calculating index command");
            }
            const arr = new ArrayInformation(this.documentDecorator, this.diagnostic.range.start);
            if (arr.isValid()) {
                try {
                    const symbols = await this.server.symbolService.getAllSymbols(this.doc);
                    this.addNecessaryConstraints(symbols, arr);
                    return Promise.resolve(this.commands);
                } catch (err) {
                    console.error(err);
                    return Promise.resolve([]);
                }
            }
        }
        return Promise.resolve(this.commands);
    }

    protected findBestEffortInsertPosition(): Position | null {
        if (!this.documentDecorator) {
            throw new Error("Document Decorator was not available to find best effort insert position");
        }
        return this.documentDecorator.tryFindBeginOfBlock(this.diagnostic.range.start);
    }

    protected findExactInsertPosition(methodStart: DafnySymbol): Position {
        if (!this.documentDecorator) {
            throw new Error("Document Decorator was not available to find insert position");
        }
        return this.documentDecorator.findInsertionPointOfContract(methodStart.start);
     }

     private addNecessaryConstraints(symbols: DafnySymbol[], array: ArrayInformation): void {
        const definingMethod = methodAt(symbols, this.diagnostic.range);
        if (!definingMethod) {
            throw new Error("Could not find defining method to add necessary constraints");
        }
        const insertPosition: Position = this.findInsertionPosition(definingMethod);
        if (insertPosition && insertPosition !== this.dummyPosition) {
            if (!this.documentDecorator) {
                throw new Error("The document decorator was not avaialable when trying to add necessary constraints");
            }
            const methodStart = this.documentDecorator.findBeginOfContractsOfMethod(definingMethod.start);
            if (definingMethod && insertPosition !== methodStart) {
                this.addInvariantCommand(insertPosition, array.indexExpression, array.identifier);
            } else {
                this.addBoundCheckCommand(insertPosition, array.indexExpression, array.identifier);
            }
        }
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

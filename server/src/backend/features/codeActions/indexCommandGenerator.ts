import { EOL } from "os";
import { Command } from "vscode-languageserver";
import { Position, TextEdit } from "vscode-languageserver-types/lib/main";
import { Commands, DafnyReports } from "./../../../strings/stringRessources";
import { DocumentDecorator } from "./../../../vscodeFunctions/documentDecorator";
import { methodAt } from "./../semanticAnalysis";
import { Symbol } from "./../symbols";
import { BaseCommandGenerator } from "./baseCommandGenerator";

export class IndexCommandGenerator extends BaseCommandGenerator {

    protected calculateCommands(): Promise<Command[]> {
        if (this.diagnostic.message === DafnyReports.IndexBounding) {
            const arr = new ArrayInformation(this.documentDecorator, this.diagnostic.range.start);
            if (arr.isValid()) {
                return this.server.symbolService.getAllSymbols(this.doc).then((symbols: Symbol[]) => {
                    this.addNecessaryConstraints(symbols, arr);
                    return Promise.resolve(this.commands);
                }).catch((err: Error) => { console.error(err); return Promise.resolve([]); });
            }
        }
        return Promise.resolve(this.commands);
    }

    protected findBestEffortInsertPosition(): Position {
        return this.documentDecorator.tryFindBeginOfBlock(this.diagnostic.range.start);
    }

    protected findExactInsertPosition(methodStart: Symbol): Position {
        if (!methodStart) {
            return null;
        }
        return this.documentDecorator.findInsertionPointOfContract(methodStart.start);
     }

     private addNecessaryConstraints(symbols: Symbol[], array: ArrayInformation): void {
        const definingMethod = methodAt(symbols, this.diagnostic.range);
        const insertPosition: Position = this.findInsertionPosition(definingMethod);
        if (insertPosition && insertPosition !== this.dummyPosition) {
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

class ArrayInformation {
    public identifier: string;
    public indexExpression: string;

    constructor(documentDecorator: DocumentDecorator, startPosition: Position) {
        const arrayExprRange = documentDecorator.readArrayExpression(startPosition);
        this.indexExpression = documentDecorator.getText(arrayExprRange);
        this.identifier = documentDecorator.parseArrayIdentifier(Position.create(arrayExprRange.start.line,
            arrayExprRange.start.character));
    }
    public isValid(): boolean {
        return this.identifier !== "" && this.indexExpression !== "";
    }
}

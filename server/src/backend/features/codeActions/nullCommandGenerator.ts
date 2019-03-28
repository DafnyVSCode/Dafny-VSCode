import {EOL} from "os";
import {Command} from "vscode-languageserver";
import { Position, TextEdit} from "vscode-languageserver-types/lib/main";
import { Commands, DafnyReports } from "./../../../strings/stringRessources";
import { methodAt } from "./../semanticAnalysis";
import { DafnySymbol } from "./../symbols";
import { BaseCommandGenerator } from "./baseCommandGenerator";

export class NullCommandGenerator extends BaseCommandGenerator {
    public calculateCommands(): Promise<Command[]> {
        if (this.diagnostic.message.indexOf(DafnyReports.NullWarning) > -1) {
            const designator = this.parseDesignator();
            if (designator !== "") {
                return this.server.symbolService.getAllSymbols(this.doc).then((symbols: DafnySymbol[]) => {
                    this.addNecessaryNullCheck(symbols, designator);
                    return this.commands;
                }).catch((err: Error) => {console.error(err); return Promise.resolve([]); });
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

    protected findExactInsertPosition(methodStart: DafnySymbol): Position | undefined {
        if (!this.documentDecorator) {
            throw new Error("Document Decorator was not available to find insert position");
        }
        const beginningOfMethod = this.documentDecorator.findBeginOfContractsOfMethod(methodStart.start);
        if (beginningOfMethod === null) {
            return undefined;
        }
        return beginningOfMethod;
    }

    private addNecessaryNullCheck(symbols: DafnySymbol[], designator: string): void {
        const definingMethod = methodAt(symbols, this.diagnostic.range);
        if (!definingMethod) {
            throw new Error(`Could not find defining method to add neccessary null check (designator: ${designator}`);
        }
        const insertPosition: Position = this.findInsertionPosition(definingMethod);
        if (insertPosition && insertPosition !== this.dummyPosition) {
                this.buildNullCheckCommand(insertPosition, designator);
        }
    }
    private parseDesignator(): string {
        const expression = this.parseExpressionWhichMayBeNull(this.diagnostic.range.start);
        return this.removeMemberAcces(expression);
    }
    private removeMemberAcces(designator: string): string {
        if (designator.lastIndexOf(".") > 0) {
            designator = designator.substr(0, designator.lastIndexOf("."));
        }
        return designator;
    }
    private parseExpressionWhichMayBeNull(diagnosisStart: Position): string {
        if (!this.documentDecorator) {
            throw new Error(`Document Decorator was not available to parse the expression which might be null at ${diagnosisStart}`);
        }
        const wordRangeBeforeIdentifier = this.documentDecorator.matchWordRangeAtPosition(diagnosisStart, false);
        if (wordRangeBeforeIdentifier === undefined) {
            throw new Error(`Could not find word range before identifier at ${diagnosisStart.line}:${diagnosisStart.character}`);
        }
        return this.documentDecorator.getText(wordRangeBeforeIdentifier);
    }

    private buildNullCheckCommand(insertPosition: Position, designator: string): void {
        const nullCheckMessage = "requires " + designator + " != null";
        const edit = TextEdit.insert(insertPosition, " " + nullCheckMessage + EOL);
        const command = Command.create(`Add null check: ${nullCheckMessage}`, Commands.EditTextCommand, this.uri, this.dummyDocId, [edit]);
        this.commands.push(command);
    }
}

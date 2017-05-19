import {EOL} from "os";
import {Command} from "vscode-languageserver";
import { Position, TextDocument, TextEdit} from "vscode-languageserver-types/lib/main";
import { Commands, DafnyReports } from "./../../../strings/stringRessources";
import { methodAt } from "./../semanticAnalysis";
import { Symbol } from "./../symbols";
import { BaseCommandGenerator } from "./baseCommandGenerator";

export class NullCommandGenerator extends BaseCommandGenerator {
    public calculateCommands(): Promise<Command[]> {
        if(this.diagnostic.message.indexOf(DafnyReports.NullWarning) > -1) {
            const expression = this.parseExpressionWhichMayBeNull(this.diagnostic.range.start);
            const designator = this.removeMemberAcces(expression);
            if(designator !== "") {
                return this.server.symbolService.getAllSymbols(this.doc).then((symbols: Symbol[]) => {
                    const definingMethod = methodAt(symbols, this.diagnostic.range);
                    const insertPosition: Position = this.findInsertionPointForNullCheck(definingMethod);
                    if(insertPosition && insertPosition !== this.dummyPosition) {
                         this.buildNullCheckCommand(insertPosition, designator);
                    }
                    return this.commands;
                }).catch((err: Error) => {console.error(err); return Promise.resolve([]); });
            }
        }
        return Promise.resolve(this.commands);
    }

    protected removeMemberAcces(designator: string): string {
        if(designator.lastIndexOf(".") > 0) {
            designator = designator.substr(0, designator.lastIndexOf("."));
        }
        return designator;
    }
    protected parseExpressionWhichMayBeNull(diagnosisStart: Position): string {
        const wordRangeBeforeIdentifier = this.documentDecorator.matchWordRangeAtPosition(diagnosisStart, false);
        return this.documentDecorator.getText(wordRangeBeforeIdentifier);
    }

    private buildNullCheckCommand(insertPosition: Position, designator: string): void {
        const nullCheckMessage = "requires " + designator + " != null";
        const edit = TextEdit.insert(insertPosition, " " + nullCheckMessage + EOL);
        this.commands.push(Command.create(`Add null check: ${nullCheckMessage}`,
        Commands.EditTextCommand, this.uri,
        this.dummyDocId, [edit]));
    }

    private findInsertionPointForNullCheck(definingMethod: Symbol): Position {
        let insertPosition: Position = this.dummyPosition;
        if(definingMethod) {
            insertPosition = this.documentDecorator.findBeginOfContractsOfMethod(definingMethod.start);
        }
        if(!insertPosition || insertPosition === this.dummyPosition) {
            insertPosition = this.documentDecorator.tryFindBeginOfBlock(this.diagnostic.range.start);
        }
        return insertPosition;
    }
}
import {CodeActionParams, Command, Diagnostic} from "vscode-languageserver";
import { Position, TextEdit, TextEditChange } from "vscode-languageserver-types/lib/main";
import { Commands, DafnyKeyWords, DafnyReports } from "./../../strings/stringRessources";
import { DocumentDecorator } from "./../../vscodeFunctions/documentDecorator";
import { translate } from "./../../vscodeFunctions/positionHelper";
import { DafnyServer } from "./../dafnyServer";
export class CodeActionProvider {

    private methodBlockStartSymbol: string = "{";
    private dummyPosition: Position = Position.create(0, 0);
    private dummyDocId: number = -1;
    private server: DafnyServer;
    public constructor(server: DafnyServer) {
        this.server = server;
    }
    public provideCodeAction(params: CodeActionParams): Thenable<Command[]> {
        const range = params.range;
        const doc = params.textDocument;
        const commands: Command[] = [];
        for(const diagnostic of params.context.diagnostics) {
            const actions = this.getCodeActions(diagnostic, params);
            if(actions) {
                for(const action of actions) {
                    commands.push(action);
                }
            }
        }
        return Promise.resolve(commands);
    }

    private getGuardCommands(diagnostic: Diagnostic, params: CodeActionParams): Command[] {
        const commands: Command[] = [];
        const message = diagnostic.message;
        for(const guardKeyWord of DafnyKeyWords.GuardKeyWords) {
            if(message.indexOf(guardKeyWord) < 0 || message.startsWith(DafnyReports.UnresolvedDecreaseWarning)) {
                continue;
            }
            const guardedExpression = this.parseGuardedExpression(message, guardKeyWord);
            const edit = TextEdit.insert(this.dummyPosition, " " + guardKeyWord + " " + guardedExpression);
            const command = Command.create(`Add ${guardKeyWord} guard`,
                Commands.EditTextCommand, params.textDocument.uri,
                this.dummyDocId, [edit], params.range, this.methodBlockStartSymbol);
            commands.push(command);
        }
        return commands;
    }

    private getNullCheckCommand(diagnostic: Diagnostic, params: CodeActionParams): Command[] {
        const commands: Command[] = [];
        if(diagnostic.message.indexOf(DafnyReports.NullWarning) > -1) {
            const doc = this.server.symbolService.getTextDocument(params.textDocument.uri);
            const documentDecorator: DocumentDecorator = new DocumentDecorator(doc);
            const expression = this.parseExpressionWhichMayBeNull(documentDecorator, diagnostic.range.start);
            const designator = this.removeMemberAcces(expression);
            if(designator !== "") {
                const rangeOfMethodStart = documentDecorator.findInsertPositionRange(diagnostic.range.start, "{");
                const edit = TextEdit.insert(this.dummyPosition, " requires " + designator + " != null");
                commands.push(Command.create("Add null check",
                    Commands.EditTextCommand, params.textDocument.uri,
                    this.dummyDocId, [edit], rangeOfMethodStart, this.methodBlockStartSymbol));
            }
        }
        return commands;
    }

    private getIndexCheckCommand(diagnostic: Diagnostic, params: CodeActionParams): Command[] {
        const commands: Command[] = [];
        if(diagnostic.message === DafnyReports.IndexBounding) {
            const doc = this.server.symbolService.getTextDocument(params.textDocument.uri);
            const documentDecorator: DocumentDecorator = new DocumentDecorator(doc);
            const word = documentDecorator.matchWordRangeAtPosition(diagnostic.range.start);
            const w = 2;
        }
        return commands;
    }

    private removeMemberAcces(designator: string): string {
        if(designator.lastIndexOf(".") > 0) {
            designator = designator.substr(0, designator.lastIndexOf("."));
        }
        return designator;
    }
    private parseExpressionWhichMayBeNull(documentDecorator: DocumentDecorator, diagnosisStart: Position): string {
        const wordRangeBeforeIdentifier = documentDecorator.matchWordRangeAtPosition(diagnosisStart, false);
        return documentDecorator.getText(wordRangeBeforeIdentifier);
    }

    private parseGuardedExpression(message: string, guardKeyword: string) {
        const lastIndexOfGuardKeyword = message.lastIndexOf(guardKeyword);
        return message.substr(lastIndexOfGuardKeyword + guardKeyword.length);
    }

    private getCodeActions(diagnostic: Diagnostic, params: CodeActionParams): Command[] {
        let commands: Command[] = [];
        commands = commands.concat(this.getGuardCommands(diagnostic, params));
        commands = commands.concat(this.getNullCheckCommand(diagnostic, params));
        return commands;
    }
}

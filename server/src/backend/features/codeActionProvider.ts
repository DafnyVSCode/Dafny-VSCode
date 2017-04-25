import {CodeActionParams, Command, Diagnostic} from "vscode-languageserver";
import { Position, TextEdit, TextEditChange } from "vscode-languageserver-types/lib/main";
import { DocumentDecorator } from "./../../vscodeFunctions/documentDecorator";
import { translate } from "./../../vscodeFunctions/positionHelper";
import { DafnyServer } from "./../dafnyServer";
export class CodeActionProvider {

    private  guardKeyWords: string[] = ["decreases", "increases"];
    private  nullObjectWarning: string = "target object may be null";
    private  editTextCommand: string = "dafny.editText";
    private  methodBlockStartSymbol: string = "{";
    private  dummyPosition: Position = Position.create(0, 0);
    private  dummyDocId: number = -1;
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

     private getCodeActions(diagnostic: Diagnostic, params: CodeActionParams): Command[] {
        const commands: Command[] = [];
        for(const guard of this.guardKeyWords) {
            if(diagnostic.message.indexOf(guard) < 0) {
                continue;
            }
            const endPosition = params.range.end;
            const lastIndexOfGuardKeyword = diagnostic.message.lastIndexOf(guard);
            const decreasingExpression = diagnostic.message.substr(lastIndexOfGuardKeyword + guard.length);
            const edit = TextEdit.insert(this.dummyPosition, " " + guard + " " + decreasingExpression);
            commands.push(Command.create(`Add ${guard} guard`,
                this.editTextCommand, params.textDocument.uri,
                this.dummyDocId, [edit], params.range, this.methodBlockStartSymbol));
        }
        if(diagnostic.message.indexOf(this.nullObjectWarning) > -1) {
            const doc = this.server.symbolService.getTextDocument(params.textDocument.uri);
            const documentDecorator: DocumentDecorator = new DocumentDecorator(doc);
            const wordRangeBeforeIdentifier = documentDecorator.matchWordRangeAtPosition(diagnostic.range.start, false);
            let designator = documentDecorator.getText(wordRangeBeforeIdentifier);
            if(designator.lastIndexOf(".") > 0) {
                designator = designator.substr(0, designator.lastIndexOf("."));
            }
            const rangeOfMethodStart = documentDecorator.findInsertPositionRange(diagnostic.range.start, "{");
            if(designator !== "") {
                const edit = TextEdit.insert(this.dummyPosition, " requires " + designator + " != null");
                commands.push(Command.create(`Add null check`,
                    this.editTextCommand, params.textDocument.uri,
                    this.dummyDocId, [edit], rangeOfMethodStart, this.methodBlockStartSymbol));
            }
        }
        return commands;
    }
}

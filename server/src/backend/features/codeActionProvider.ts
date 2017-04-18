import {CodeActionParams, Command, Diagnostic} from "vscode-languageserver";
import { Position, TextEdit, TextEditChange } from "vscode-languageserver-types/lib/main";
import { DocumentDecorator } from "./../../vscodeFunctions/documentfunctions";
export class CodeActionProvider {

    private static guardKeyWords: string[] = ["decreases", "increases"];
    private static editTextCommand: string = "dafny.editText";
    private static methodBlockStartSymbol: string = "{";
    private static dummyPosition: Position = Position.create(0, 0);
    private static dummyDocId: number = -1;
    private codeActionProviders: Array<(Diagnostic, CodeActionParams) => Command[]> = [this.getCodeActions];

    public provideCodeAction(params: CodeActionParams): Thenable<Command[]> {
        const range = params.range;
        const doc = params.textDocument;
        const commands: Command[] = [];
        for(const diagnostic of params.context.diagnostics) {
            for(const codeActionProvider of this.codeActionProviders) {
                const actions = codeActionProvider(diagnostic, params);
                if(actions) {
                    for(const action of actions) {
                        commands.push(action);
                    }
                }
            }
        }
        return Promise.resolve(commands);
    }

     private getCodeActions(diagnostic: Diagnostic, params: CodeActionParams): Command[] {
        const commands: Command[] = [];
        for(const guard of CodeActionProvider.guardKeyWords) {
            if(diagnostic.message.indexOf(guard) < 0) {
                continue;
            }
            const endPosition = params.range.end;
            const lastIndexOfGuardKeyword = diagnostic.message.lastIndexOf(guard);
            const decreasingExpression = diagnostic.message.substr(lastIndexOfGuardKeyword + guard.length);
            const edit = TextEdit.insert(CodeActionProvider.dummyPosition, " " + guard + " " + decreasingExpression);
            commands.push(Command.create(`Add ${guard} guard`,
                CodeActionProvider.editTextCommand, params.textDocument.uri,
                CodeActionProvider.dummyDocId, [edit], params.range, CodeActionProvider.methodBlockStartSymbol));
        }
        return commands;
    }
}


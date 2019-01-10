import {CodeActionParams, Command, Diagnostic} from "vscode-languageserver";
import { DafnyServer } from "./../dafnyServer";
import { BaseCommandGenerator } from "./codeActions/baseCommandGenerator";
import { GuardCommandGenerator } from "./codeActions/guardCommandGenerator";
import { IndexCommandGenerator } from "./codeActions/indexCommandGenerator";
import { NullCommandGenerator } from "./codeActions/nullCommandGenerator";

export class CodeActionProvider {
    private server: DafnyServer;
    public constructor(server: DafnyServer) {
        this.server = server;
    }
    public provideCodeAction(params: CodeActionParams): Thenable<Command[]> {
        return new Promise<Command[]>((resolve) => {
            return resolve(params.context.diagnostics.map((e: Diagnostic) => {
               return this.getCodeActions(e, params);
            }).reduceRight(
                (collectorPromise: Promise<Command[]>, nextPromise: Promise<Command[]>) => collectorPromise.then(
                    (collectorCommands: Command[]) => nextPromise.then(
                        (nextCommands: Command[]) => collectorCommands.concat(nextCommands),
                    ),
                ), Promise.resolve([])));
        });
    }

    private getCodeActions(diagnostic: Diagnostic, params: CodeActionParams): Promise<Command[]> {
        return this.collect([
            new IndexCommandGenerator(this.server, diagnostic, params),
            new NullCommandGenerator(this.server, diagnostic, params),
            new GuardCommandGenerator(this.server, diagnostic, params),
        ]);
    }

    private collect(commandGenerators: BaseCommandGenerator[]): Promise<Command[]> {
        return commandGenerators.reduceRight(
            async (collection: Promise<Command[]>, nextGenerator: BaseCommandGenerator) => {
                const commands = await collection;
                const newCommands = await nextGenerator.generateCommands();
                return commands.concat(newCommands);
            }, Promise.resolve([]),
        );
    }
}

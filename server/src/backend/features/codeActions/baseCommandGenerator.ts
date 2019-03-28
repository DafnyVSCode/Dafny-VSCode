import {CodeActionParams, Command, Diagnostic} from "vscode-languageserver";
import { Position, TextDocument} from "vscode-languageserver-types/lib/main";
import { DocumentDecorator } from "./../../../vscodeFunctions/documentDecorator";
import { DafnyServer } from "./../../dafnyServer";
import { DafnySymbol } from "./../symbols";

export abstract class BaseCommandGenerator {
    protected commands: Command[];
    protected server: DafnyServer;
    protected dummyPosition: Position = Position.create(0, 0);
    protected dummyDocId: number = -1;
    protected documentDecorator: DocumentDecorator | undefined;
    protected diagnostic: Diagnostic;
    protected uri: string;
    protected doc: TextDocument;
    constructor(server: DafnyServer, diagnostic: Diagnostic, params: CodeActionParams) {
        this.commands = [];
        this.server = server;
        this.uri = params.textDocument.uri;
        this.doc = this.server.symbolService.getTextDocument(this.uri);
        this.diagnostic = diagnostic;
    }

    public generateCommands(): Promise<Command[]> {
        if (!this.doc) {
            return Promise.resolve([]);
        }
        this.documentDecorator = new DocumentDecorator(this.doc);
        return this.calculateCommands();
    }
    protected abstract calculateCommands(): Promise<Command[]>;
    protected findInsertionPosition(startSymbol: DafnySymbol): Position {
        let insertPosition = this.findExactInsertPosition(startSymbol);
        if (!insertPosition || insertPosition === this.dummyPosition) {
            const bestEffort = this.findBestEffortInsertPosition();
            if (bestEffort === null) {
                throw new Error("Could not find a best effort insert position");
            }
            insertPosition = bestEffort;
        }
        return insertPosition;
    }

    protected abstract findBestEffortInsertPosition(): Position | null;
    protected abstract findExactInsertPosition(startSymbol: DafnySymbol): Position | undefined;
}

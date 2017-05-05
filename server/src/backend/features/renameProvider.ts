import { Position, TextDocument, WorkspaceEdit } from "vscode-languageserver";
import { TextEdit } from "vscode-languageserver-types";
import { DocumentDecorator } from "../../vscodeFunctions/documentDecorator";
import { DafnyServer } from "./../dafnyServer";
import { SymbolType } from "./symbols";
import { Symbol} from "./symbols";

export class DafnyRenameProvider {
    public constructor(public server: DafnyServer) { }
    public provideRenameEdits(document: TextDocument, position: Position, newName: string): Thenable<WorkspaceEdit> {
        return this.provideRenameInternal(newName, document, position).then((definitionInfo: WorkspaceEdit) => {
            if (definitionInfo != null) {
                return definitionInfo;
            }
            return null;
        }, (err) => {
            console.error(err);
            return null;
        });
    }

    private provideRenameInternal(newName: string, document: TextDocument, position: Position): Promise<WorkspaceEdit> {
        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        const word = documentDecorator.getWordAtPosition(position, false);
        return this.server.symbolService.getAllSymbols(document).then((symbols: Symbol[]) => {
            const definingClass: Symbol = symbols.find((s: Symbol) => s.isClassDefinedAtPosition(position));
            const changes: {
                [uri: string]: TextEdit[];
            } = {};
            if (definingClass) {
                const relevantSymbols: Symbol[] = symbols.filter((s: Symbol) => s.isCompletableMemberOfClass(word, definingClass.name));
                for (const symbol of relevantSymbols) {
                    if (!changes[symbol.document.uri]) {
                        changes[symbol.document.uri] = [];
                    }
                    if (symbol.symbolType !== SymbolType.Call) {
                        changes[symbol.document.uri].push(TextEdit.replace(symbol.range, newName));
                    }
                    for (const ref of symbol.References) {
                        if (!changes[ref.document.uri]) {
                            changes[ref.document.uri] = [];
                        }
                        changes[ref.document.uri].push(TextEdit.replace(ref.range, newName));
                    }
                }
            }
            const workSpaceEdit: WorkspaceEdit = {};
            workSpaceEdit.changes = changes;
            return workSpaceEdit;

        }).catch((e: any) => { console.error(e); });
    }
}

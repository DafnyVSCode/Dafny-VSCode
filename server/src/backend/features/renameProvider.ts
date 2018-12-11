import { Position, Range, TextDocument, WorkspaceEdit } from "vscode-languageserver";
import { TextEdit } from "vscode-languageserver-types";
import { DocumentDecorator } from "../../vscodeFunctions/documentDecorator";
import { DafnyServer } from "./../dafnyServer";
import { SymbolType } from "./symbols";
import { DafnySymbol} from "./symbols";
import { Reference } from "./Reference";

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
        return this.collectRenamings(document, word, newName, position)
            .catch((e: any) => { console.error(e); return {}; });
    }

    private collectRenamings(document: TextDocument, word: string, newName: string, position: Position): Promise<WorkspaceEdit> {
        return this.server.symbolService.getAllSymbols(document).then((symbols: DafnySymbol[]) => {
            const renamer = new WorkSpaceRenameHolder(word, newName, symbols, position);
            const workSpaceEdit: WorkspaceEdit = {};
            workSpaceEdit.changes = renamer.collectRenamings();
            return workSpaceEdit;
        });
    }

    private getDefaultChangeSet(): {[uri: string]: TextEdit[]} {
        return {};
    }

    private buildReferenceEdit(ref: Reference, newName: string): TextEdit {
        return TextEdit.replace(ref.range, newName);
    }
}

class WorkSpaceRenameHolder {
    private changeSet: {[uri: string]: TextEdit[]};
    private word: string;
    private newName: string;
    private symbols: DafnySymbol[];
    private symbolPosition: Position;
    constructor(word: string, newName: string, symbols: DafnySymbol[], position: Position) {
        this.changeSet = {};
        this.word = word;
        this.newName = newName;
        this.symbols = symbols;
        this.symbolPosition = position;
    }

    public collectRenamings(): {[uri: string]: TextEdit[]} {
        const definingClass: DafnySymbol = this.getDefiningClass();
        if (definingClass) {
            const relevantSymbols: DafnySymbol[] = this.getRelevantSymbolsForClass(definingClass.name);
            for (const symbol of relevantSymbols) {
                if (symbol.symbolType !== SymbolType.Call) {
                    this.addEdit(symbol.document.uri, this.buildSymbolEdit(symbol));
                }
                for (const ref of symbol.References) {
                    this.addEdit(ref.document.uri, this.buildReferenceEdit(ref));
                }
            }
        }
        return this.changeSet;
    }

    private getRelevantSymbolsForClass(className: string): DafnySymbol[] {
        return this.symbols.filter((s: DafnySymbol) => s.isCompletableMemberOfClass(this.word, className));
    }
    private getDefiningClass(): DafnySymbol {
        return this.symbols.find((s: DafnySymbol) => s.isClassDefinedAtPosition(this.symbolPosition));
    }

    private addEdit(uri: string, edit: TextEdit): void {
        if (!this.changeSet[uri]) {
            this.changeSet[uri] = [];
        }
        this.changeSet[uri].push(edit);
    }
    private buildReferenceEdit(ref: Reference): TextEdit {
        return TextEdit.replace(ref.range, this.newName);
    }

    private buildSymbolEdit(symbol: DafnySymbol): TextEdit {
        return TextEdit.replace(Range.create(symbol.start,
            Position.create(symbol.start.line, symbol.start.character + symbol.name.length)), this.newName);
    }
}

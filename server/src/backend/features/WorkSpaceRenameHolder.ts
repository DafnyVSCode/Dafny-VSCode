import { Position, Range } from "vscode-languageserver";
import { TextEdit } from "vscode-languageserver-types";
import { Reference } from "./Reference";
import { SymbolType } from "./symbols";
import { DafnySymbol } from "./symbols";
export class WorkSpaceRenameHolder {
    private changeSet: {
        [uri: string]: TextEdit[];
    };
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
    public collectRenamings(): {
        [uri: string]: TextEdit[];
    } {
        const definingClass = this.getDefiningClass();
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
    private getDefiningClass(): DafnySymbol | undefined {
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
        return TextEdit.replace(Range.create(symbol.start, Position.create(symbol.start.line, symbol.start.character + symbol.name.length)), this.newName);
    }
}

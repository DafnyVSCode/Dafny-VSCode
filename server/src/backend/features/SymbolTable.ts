import { DafnySymbol } from "./symbols";
export class SymbolTable {
    public symbols: DafnySymbol[];
    public hash: number;
    public fileName: string;
    constructor(fileName: string) {
        this.symbols = [];
        this.fileName = fileName;
    }
}

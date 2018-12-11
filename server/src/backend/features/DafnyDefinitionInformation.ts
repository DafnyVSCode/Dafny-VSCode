import { DafnySymbol } from "./symbols";
export class DafnyDefinitionInformation {
    public filePath: string;
    public symbol: DafnySymbol;
    constructor(symbol: DafnySymbol) {
        this.symbol = symbol;
        this.filePath = symbol.document.uri;
    }
}

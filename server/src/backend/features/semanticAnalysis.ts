import { Range } from "vscode-languageserver-types/lib/main";
import { rangesIntersect } from "./../../vscodeFunctions/positionHelper";
import { DafnySymbol, SymbolType } from "./symbols";

export function methodAt(symbols: DafnySymbol[], range: Range) {
    if (!symbols || !symbols.length) {
        return null;
    }
    return symbols.find((e: DafnySymbol) => {
        return (e.isOfType([SymbolType.Method, SymbolType.Function, SymbolType.Predicate]))
            && rangesIntersect(e.range, range);
    });
}

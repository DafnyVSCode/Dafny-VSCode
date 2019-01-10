import { Position, Range } from "vscode-languageserver-types/lib/main";
import { extractIdentifiers } from "./../../strings/stringUtils";
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

export function declarationsAt(symbols: DafnySymbol[], range: Range, identifiers: string[]): DafnySymbol[] {
    if (!symbols || !symbols.length || !identifiers || !identifiers.length) {
        return null;
    }
    return symbols.filter((e: DafnySymbol) => {
        return (e.symbolType === SymbolType.Definition && rangesIntersect(e.range, range)
            && identifiers.indexOf(e.name) >= 0);
    });
}

export function findLastSymbol(symbols: DafnySymbol[]): DafnySymbol {
    if (!symbols || ! symbols.length) {
        return null;
    }
    return symbols.reduce((max, x) => {
        return x.line >= max.line && x.column > max.column ? x : max;
    });
}
export function findLastDeclaration(expression: string, symbols: DafnySymbol[], definingMethod: DafnySymbol): Position {
    const identifiers = extractIdentifiers(expression);
    const declarationsOfIdentifiers = declarationsAt(symbols, definingMethod.range, identifiers);
    if (!declarationsOfIdentifiers || declarationsOfIdentifiers.length === 0) {
        return null;
    }
    const lastDeclaration = findLastSymbol(declarationsOfIdentifiers);
    if (lastDeclaration) {
        return lastDeclaration.start;
    }
    return null;
}

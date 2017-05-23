import { Position, Range } from "vscode-languageserver-types/lib/main";
import { extractIdentifiers } from "./../../strings/stringUtils";
import { rangesIntersect } from "./../../vscodeFunctions/positionHelper";
import { Symbol, SymbolType } from "./symbols";
export function methodAt(symbols: Symbol[], range: Range) {
    if(!symbols || !symbols.length) {
        return null;
    }
    return symbols.find((e: Symbol) => {
        return (e.isOfType([SymbolType.Method, SymbolType.Function, SymbolType.Predicate]))
            && rangesIntersect(e.range, range);
    });
}

export function declarationsAt(symbols: Symbol[], range: Range, identifiers: string[]): Symbol[] {
    if(!symbols || !symbols.length || !identifiers || !identifiers.length) {
        return null;
    }
    return symbols.filter((e: Symbol) => {
        return (e.symbolType === SymbolType.Definition && rangesIntersect(e.range, range)
            && identifiers.indexOf(e.name) >= 0);
    });
}

export function findLastSymbol(symbols: Symbol[]): Symbol {
    if(!symbols || ! symbols.length) {
        return null;
    }
    return symbols.reduce((max, x) => {
        return x.line >= max.line && x.column > max.column ? x : max;
    });
}
export function findLastDeclaration(expression: string, symbols: Symbol[], definingMethod: Symbol): Position {
    const identifiers = extractIdentifiers(expression);
    const declarationsOfIdentifiers = declarationsAt(symbols, definingMethod.range, identifiers);
    if(!declarationsOfIdentifiers || declarationsOfIdentifiers.length === 0) {
        return null;
    }
    const lastDeclaration = findLastSymbol(declarationsOfIdentifiers);
    if(lastDeclaration) {
        return lastDeclaration.start;
    }
    return null;
}

"use strict";
import { TextDocument } from "vscode-languageserver";
import { DafnyServer } from "../dafnyServer";
import { ReferencesCodeLens } from "./codeLenses";
import { SymbolTable } from "./SymbolTable";
export class DafnyBaseCodeLensProvider {
    private enabled: boolean = true;

    public constructor(public server: DafnyServer) {}
    public async provideCodeLenses(document: TextDocument): Promise<ReferencesCodeLens[]> {
        if (!this.enabled || !document) {
            return [];
        }

        try {
            const symbolTables = await this.server.symbolService.getSymbols(document);
            const symbolTable = symbolTables.find((table: SymbolTable) => table.fileName === document.uri);
            if (!symbolTable) {
                return [];
            }
            return symbolTable.symbols
                .filter((symbol) => symbol.needsCodeLens())
                .map((symbol) => new ReferencesCodeLens(symbol));
        } catch (err) {
            console.error(err);
            return [];
        }
    }
}

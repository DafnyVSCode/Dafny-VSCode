"use strict";
import { TextDocument } from "vscode-languageserver";
import { DafnyServer } from "../dafnyServer";
import { ReferencesCodeLens } from "./codeLenses";
import { Symbol, SymbolTable } from "./symbols";
export class DafnyBaseCodeLensProvider {
    private enabled: boolean = true;

    public constructor(public server: DafnyServer) {}
    public provideCodeLenses(document: TextDocument): Promise<ReferencesCodeLens[]> {
        if (!this.enabled || !document) {
            return Promise.resolve([]);
        }
        return this.server.symbolService.getSymbols(document)
        .then((symbolTables: SymbolTable[]) => {
            return symbolTables.find((table: SymbolTable) => table.fileName === document.uri).symbols
                .filter((info: Symbol) => info.needsCodeLens())
                .map((info: Symbol) => new ReferencesCodeLens(info));
        }).catch((err: Error) => {
            console.error(err);
            return [];
        });
    }
}

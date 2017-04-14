"use strict";
import {CodeLens, Event, TextDocument} from "vscode-languageserver";
import {DafnyServer} from "../dafnyServer";
import { bubbleRejectedPromise } from "./../../util/promiseHelpers";
import { ReferencesCodeLens } from "./codeLenses";
import { SymbolType } from "./symbols";
import { Symbol, SymbolTable } from "./symbols";

export class DafnyBaseCodeLensProvider {
    private enabled: boolean = true;

    public constructor(public server: DafnyServer) {}
    public provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
        console.log("Start codelenses");
        if (!this.enabled || !document) {
            console.log("Stopped codelenses");
            return Promise.resolve([]);
        }
        return this.server.symbolService.getSymbols(document)
        .then((symbolTables: SymbolTable[]) => {
            return symbolTables.find((table: SymbolTable) => table.fileName === document.uri).symbols
                .filter((info: Symbol) => !(info.name === "_default" && info.symbolType === SymbolType.Class) &&
                    (info.symbolType !== SymbolType.Unknown && info.symbolType !== SymbolType.Call))
                .map((info: Symbol) => new ReferencesCodeLens(info));
        }, bubbleRejectedPromise);
    }
}

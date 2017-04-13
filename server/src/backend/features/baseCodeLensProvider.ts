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
        if (!this.enabled || !document) {
            return Promise.resolve([]);
        }
        return this.server.symbolService.getSymbols(document)
        .then((symbolTable: SymbolTable) => {
            return symbolTable.symbols
                .filter((info: Symbol) => !(info.name === "_default" && info.symbolType === SymbolType.Class) &&
                    (info.symbolType !== SymbolType.Unknown && info.symbolType !== SymbolType.Call))
                .map((info: Symbol) => new ReferencesCodeLens(document, info));
        }, bubbleRejectedPromise);
    }
}
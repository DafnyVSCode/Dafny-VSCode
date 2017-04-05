"use strict";
import {CodeLens, CodeLensProvider, Event, EventEmitter, TextDocument} from "vscode";
import {DafnyServer} from "../dafnyServer";
import { bubbleRejectedPromise } from "./../../Util/PromiseHelpers";
import { CodeLensInfo, ReferencesCodeLens } from "./CodeLenses";
import { SymbolTable } from "./symbolService";

export class DafnyBaseCodeLensProvider implements CodeLensProvider {
    private enabled: boolean = true;
    private onDidChangeCodeLensesEmitter = new EventEmitter<void>();

    public constructor(public server: DafnyServer) {
}

    public get onDidChangeCodeLenses(): Event<void> {
        return this.onDidChangeCodeLensesEmitter.event;
    }

    public provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
        if (!this.enabled || !document) {
            return Promise.resolve([]);
        }
        return new Promise<CodeLensInfo[]>((resolve, reject) => {
            return this.server.symbolService.getSymbols(document).then((symbols: SymbolTable) => {
            this.handleProcessData(symbols, ((data) => {resolve(data); }));
        }).catch(() => reject(null));
        }).then((definitions: CodeLensInfo[]) => {
            if (definitions == null || !definitions.length) {
                return [];
            }
            return definitions.map((info: CodeLensInfo) =>
            new ReferencesCodeLens(document, info));

        }, bubbleRejectedPromise);
    }

    private handleProcessData(symbols: SymbolTable, callback: (data: any) => any): void {
        const definitionInfo = this.parseSymbols(symbols);
        callback(definitionInfo);
    }

    private parseSymbols(symbols: SymbolTable): CodeLensInfo[] {
        const lenses: CodeLensInfo[] = [];
        for(const symbolDef of symbols.symbols) {
            lenses.push(new CodeLensInfo(symbolDef));
        }
        return lenses;
    }
}

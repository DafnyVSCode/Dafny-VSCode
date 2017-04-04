"use strict";

import {CodeLens, CodeLensProvider, Event, EventEmitter, Position, Range,
    TextDocument} from "vscode";
import {DafnyServer} from "../dafnyServer";
import { CodeLensInfo, ReferencesCodeLens } from "./CodeLenses";

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
            return this.server.symbolService.getSymbols(document).then((symbols: any) => {
            this.handleProcessData(symbols, ((data) => {resolve(data); }));
        }).catch(() => reject(null));
        }).then((definitions: CodeLensInfo[]) => {
            if (definitions == null || !definitions.length) {
                return Promise.resolve([]);
            }
            return definitions.map((info: CodeLensInfo) =>
            new ReferencesCodeLens(document, info));

        }, (err: any) => {
            console.error(err);
            return Promise.resolve(null);
        });
    }

    private handleProcessData(symbols: any, callback: (data: any) => any): void {
        const definitionInfo = this.parseSymbols(symbols);
        callback(definitionInfo);
    }

    private parseSymbols(symbols: any): CodeLensInfo[] {
        try {
            const lenses: CodeLensInfo[] = [];
            if(symbols.length && symbols.length > 0) {
                for(const symbolDef of symbols) {
                    const line = Math.max(0, parseInt(symbolDef.Line, 10) - 1); // 1 based
                    const column = Math.max(0, parseInt(symbolDef.Column, 10) - 1); // ditto, but 0 can appear in some cases
                    if(!isNaN(line) && !isNaN(column)) {
                        const start = new Position(line, column);
                        const end = new Position(line, column + Number(symbolDef.Name.length));
                        if(symbolDef.Module && symbolDef.ParentClass) {
                            lenses.push(new CodeLensInfo(new Range(start, end), symbolDef.Name,
                            symbolDef.Module, symbolDef.ParentClass));
                        }
                    }
                }
            }
            return lenses;
        } catch(exception) {
            console.error("Failure  to parse response: " + exception);
            return [];
        }
    }
}

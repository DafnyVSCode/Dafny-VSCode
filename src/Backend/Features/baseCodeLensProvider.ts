"use strict";

import * as vscode from "vscode";
import {CodeLens, CodeLensProvider, Event, EventEmitter, Position, Range,
    TextDocument} from "vscode";
import {DafnyServer} from "../dafnyServer";
import { EnvironmentConfig } from "./../../Strings/stringRessources";
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
                return this.askDafnyDef(resolve, reject, document);
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

    private askDafnyDef(resolve: any, reject: any, document: vscode.TextDocument) {
        this.server.addDocument(document, "symbols", (log) =>  {
            this.handleProcessData(log, ((data) => {resolve(data); }), document);

        }, () => {reject(null); });
    }

    private handleProcessData(log: string, callback: (data: any) => any, document: TextDocument): void {
        if(log && log.indexOf(EnvironmentConfig.DafnyDefSuccess) > 0
                && log.indexOf(EnvironmentConfig.DafnyDefFailure) < 0 && log.indexOf("SYMBOLS_START ") > -1) {
            const info = log.substring("SYMBOLS_START ".length, log.indexOf(" SYMBOLS_END"));
            const json = this.getResponseAsJson(info);
            this.addSymbolsToCache(json, document);
            const definitionInfo = this.parseResponse(json);
            callback(definitionInfo);
        }
    }
    private addSymbolsToCache(info: any, document: TextDocument) {
        this.server.addSymbols(document, info);
    }
    private getResponseAsJson(info: string) {
        try {
            return JSON.parse(info);
        } catch(exception) {
            console.error("Failure  to parse response: " + exception);
            return null;
        }
    }
    private parseResponse(response: any): CodeLensInfo[] {
        try {
            const lenses: CodeLensInfo[] = [];
            if(response.length && response.length > 0) {
                for(const symbolDef of response) {
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

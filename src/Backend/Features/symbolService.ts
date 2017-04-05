"use strict";
import * as vscode from "vscode";
import {TextDocument} from "vscode";
import {DafnyServer} from "../dafnyServer";
import { EnvironmentConfig } from "./../../Strings/stringRessources";
import { hashString } from "./../../Strings/StringUtils";

export class SymbolService {
    private symbolTable: {[fileName: string]: any} = {};

    public constructor(public server: DafnyServer) {}

    public addSymbols(doc: TextDocument, symbols: any, forceAddition: boolean = false): void {
        const hash = hashString(doc.getText());
        if(forceAddition) {
            this.symbolTable[doc.fileName] = symbols;
        } else {
            this.getSymbols(doc).then((sym: any) => {
                if(!sym || sym.hash !== hash) {
                    this.symbolTable[doc.fileName] = symbols;
                }
            });
        }
    }

    public getSymbols(doc: TextDocument): Promise<any> {
        const symbols = this.symbolTable[doc.fileName];
        if(!symbols) {
            return this.getSymbolsFromDafny(doc).then((symb: any) => {
                symb.hash = hashString(doc.getText());
                this.addSymbols(doc, symb, true);
                return Promise.resolve(symb);
            });
        } else {
            return Promise.resolve(symbols);
        }
    }

    public getSymbolsFromDafny(document: TextDocument): Promise<any> {
        if (!document) {
            return Promise.resolve(null);
        }
        return new Promise<any>((resolve, reject) => {
                return this.askDafnyForSymbols(resolve, reject, document);
        }).then((symbols: any) => {
            if (!symbols) {
                return Promise.resolve([]);
            }
            return Promise.resolve(symbols);

        }, (err: any) => {
            console.error(err);
            return Promise.resolve(null);
        });
    }

    private askDafnyForSymbols(resolve: any, reject: any, document: vscode.TextDocument) {
        this.server.addDocument(document, "symbols", (log) =>  {
            this.handleProcessData(log, ((data) => {resolve(data); }));
        }, () => {reject(null); });
    }

    private handleProcessData(log: string, callback: (data: any) => any): void {
        if(log && log.indexOf(EnvironmentConfig.DafnySuccess) > 0
                && log.indexOf(EnvironmentConfig.DafnyFailure) < 0 && log.indexOf("SYMBOLS_START ") > -1) {
            const info = log.substring("SYMBOLS_START ".length, log.indexOf(" SYMBOLS_END"));
            const json = this.getResponseAsJson(info);
            callback(json);
        }
    }

    private getResponseAsJson(info: string) {
        try {
            return JSON.parse(info);
        } catch(exception) {
            console.error("Failure  to parse response: " + exception);
            return null;
        }
    }
}

"use strict";

import * as vscode from "vscode";
import {CodeLens, CodeLensProvider, Event, EventEmitter, Position, Range,
    TextDocument, Uri } from "vscode";
//import { decodeBase64 } from "./../../Strings/stringEncoding";
import { EnvironmentConfig } from "./../../Strings/stringRessources";
import {DafnyServer} from "../dafnyServer";

export class ReferencesCodeLens extends CodeLens {
    constructor(public text: vscode.TextDocument, public document: Uri, public codeLensInfo: CodeLensInfo) {
        super(codeLensInfo.range);
    }
}

export class CodeLensInfo {
    public constructor(public filePath: string, public range: Range, public symbol: string,
                       public module: string, public parentClass: string) {
    }
}
export class CodeLensInformtation {
    public lenses: CodeLensInfo[];
    constructor(dafnyDefResponse: any) {
        this.lenses = [];
        if(dafnyDefResponse.length && dafnyDefResponse.length > 0) {
            for(const symbolDef of dafnyDefResponse) {
                if(symbolDef.SymbolInfos && symbolDef.SymbolInfos.length && symbolDef.SymbolInfos.length > 0) {
                    for(const symbolInfo of symbolDef.SymbolInfos) {
                        const line = Math.max(0, parseInt(symbolInfo.Line, 10) - 1); // 1 based
                        const column = Math.max(0, parseInt(symbolInfo.Column, 10) - 1); // ditto, but 0 can appear in some cases
                        if(!isNaN(line) && !isNaN(column)) {
                            const start = new Position(line, column);
                            const end = new Position(line, column + Number(symbolInfo.Name.length));
                            const path = String(symbolDef.FilePath);
                            if(symbolInfo.Module && symbolInfo.ParentClass) {
                                this.lenses.push(new CodeLensInfo(path, new Range(start, end), symbolInfo.Name,
                                symbolInfo.Module, symbolInfo.ParentClass));
                            }
                        }
                    }
                }
            }
        }
    }
}

export class DafnyBaseCodeLensProvider implements CodeLensProvider {
    private enabled: boolean = true;
    private onDidChangeCodeLensesEmitter = new EventEmitter<void>();

    public constructor(public server: DafnyServer) {

    }

    public get onDidChangeCodeLenses(): Event<void> {
        return this.onDidChangeCodeLensesEmitter.event;
    }

    public provideDefinitionInternal(
        document: TextDocument): Promise<CodeLensInformtation> {
            return new Promise<CodeLensInformtation>((resolve, reject) => {
                if(!document) {
                    return resolve(null);
                }
                return this.askDafnyDef(resolve, reject, document);
        });
    }

    public provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
        if (!this.enabled) {
            return Promise.resolve([]);
        }
        return this.provideDefinitionInternal(document).then((definitions: CodeLensInformtation) => {
            if (definitions == null || definitions.lenses == null) {
                return Promise.resolve([]);
            }
            return definitions.lenses.map((info: CodeLensInfo) =>
            new ReferencesCodeLens(document, document.uri, info));

        }, (err: any) => {
            console.error(err);
            return Promise.resolve(null);
        });
    }

    private askDafnyDef(resolve: any, reject: any, document: vscode.TextDocument) {
        this.server.addDocument(document, "symbols", (log) =>  {
            this.handleProcessData(log, ((data) => {resolve(data)}));

        }, () => {reject(null)});
    }

    /*private askDafnyDef(resolve: any, reject: any, document: TextDocument) {
        if(!this.serverIsAlive()) {
            const environment = new Environment();
            const command = environment.getStartDafnyCommand();
            const options = environment.getStandardSpawnOptions();
            const process = cp.spawn(command.command, command.args, options);
            this.serverProc = new ProcessWrapper(process,
                (err: Error) => { this.handleProcessError(err); },
                () => {this.handleProcessData((data) => {
                    if(!data) {
                        return reject(null);
                    }
                    return resolve(data);
                }); },
                () => { this.handleProcessExit(); },
                Verification.commandEndRegexDafnyDef
            );
        } else {
            this.serverProc.reasignCallbacks(
                (err: Error) => { this.handleProcessError(err); },
                () => {this.handleProcessData((data) => {
                    if(!data) {
                        return reject(null);
                    }
                    return resolve(data);
                }); },
                () => { this.handleProcessExit(); });
        }

        const task: GetDefinitionsTask = {
            args: [],
            baseDir: workspace.rootPath,
            fileName: document.fileName
        };
        if(this.environment.usesMono) {
            task.monoPath = this.environment.getMonoPath();
        }
        try {
            const encoded = encodeBase64(task);
            this.serverProc.clearBuffer();
            this.serverProc.writeGetDefinitionsRequestToDafnyDef(encoded, "getDefinitions");
        } catch(exception) {
            console.error("Unable to encode request task:" + exception);
        }
    }*/

    private handleProcessData(log: string, callback: (data: any) => any): void {
        if(log && log.indexOf(EnvironmentConfig.DafnyDefSuccess) > 0 && log.indexOf(EnvironmentConfig.DafnyDefFailure) < 0 && log.indexOf("SYMBOLS_START ") > -1) {
            const info = log.substring("SYMBOLS_START ".length, log.indexOf(" SYMBOLS_END"));
            const definitionInfo = this.parseResponse(info);

            if(definitionInfo) {
                callback(definitionInfo);
            } else {
                callback(null);
            }
        }
    }

    private parseResponse(response: string): CodeLensInformtation {
        try {
            //const responseJson =  decodeBase64(response);
            return new CodeLensInformtation(response);
        } catch(exception) {
            console.error("Failure  to parse response: " + exception);
            return null;
        }
    }
}

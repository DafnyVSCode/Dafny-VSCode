"use strict";

import * as cp from "child_process";
import {
    CodeLens,
    CodeLensProvider,
    Event,
    EventEmitter,
    Position,
    Range,
    TextDocument,
    Uri,
    window,
    workspace
} from "vscode";
import { ProcessWrapper } from "./../../Process/process";
import { Verification } from "./../../Strings/regexRessources";
import { encodeBase64 } from "./../../Strings/stringEncoding";
import { decodeBase64 } from "./../../Strings/stringEncoding";
import { EnvironmentConfig } from "./../../Strings/stringRessources";
import { Environment } from "./../environment";

export class ReferencesCodeLens extends CodeLens {
    constructor(public document: Uri, public file: string, range: Range, public symbol: string,
                public module: string, public parentClass: string, public source: string) {
        super(range);
    }
}

export class CodeLensInfo {
    public filePath: string;
    public position: Range;
    public symbol: string;
    public module: string;
    public parentClass: string;
    public source: string;
    public constructor(filePath: string, start: Position, end: Position, symbol: string,
                       module: string, parentClass: string) {
        this.filePath = filePath;
        this.position = new Range(start, end);
        this.symbol = symbol;
        this.module = module;
        this.parentClass = parentClass;
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
                                this.lenses.push(new CodeLensInfo(path, start, end, symbolInfo.Name,
                                symbolInfo.Module, symbolInfo.ParentClass));
                            }
                        }
                    }
                }
            }
        }
    }
}

interface GetDefinitionsTask {
    args: string[];
    baseDir: string;
    fileName: string;
    monoPath?: string;
}
export class DafnyBaseCodeLensProvider implements CodeLensProvider {
    protected serverProc: ProcessWrapper;
    protected environment: Environment = new Environment();
    private enabled: boolean = true;
    private onDidChangeCodeLensesEmitter = new EventEmitter<void>();

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
                return Promise.resolve(null);
            }
            return definitions.lenses.map((info: CodeLensInfo) =>
            new ReferencesCodeLens(document.uri, info.filePath, info.position, info.symbol,
            info.module, info.parentClass, document.getText()));

        }, (err: any) => {
            if (err) {
                console.log(err);
            }
            return Promise.resolve(null);
        });
    }

    private askDafnyDef(resolve: any, reject: any, document: TextDocument) {
        if(!this.serverIsAlive()) {
            const environment = new Environment();
            const command = environment.getStartDafnyDefCommand();
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
        const encoded = encodeBase64(task);
        this.serverProc.clearBuffer();
        this.serverProc.writeGetDefinitionsRequestToDafnyDef(encoded);
    }

    private handleProcessError(err: Error): void {
        window.showErrorMessage("DafnyDef process " + this.serverProc.pid + " error: " + err);
        console.error("dafny server stdout error:" + err.message);
    }

    private handleProcessData(callback: (data: any) => any): void {
        const log: string = this.serverProc.outBuf.substr(0, this.serverProc.positionCommandEnd());
        if(log && log.indexOf(EnvironmentConfig.DafnyDefSuccess) > 0 && log.indexOf(EnvironmentConfig.DafnyDefFailure) < 0) {
            const definitionInfo = this.parseResponse(log.substring(0, log.indexOf(EnvironmentConfig.DafnyDefSuccess)));
            if(definitionInfo) {
                callback(definitionInfo);
            } else {
                callback(null);
            }
        }
        console.log(log);
        this.serverProc.clearBuffer();
    }

    private parseResponse(response: string): CodeLensInformtation {
        const responseJson =  decodeBase64(response);
        return new CodeLensInformtation(responseJson);
    }
    private handleProcessExit() {
        if(this.serverIsAlive()) {
            this.serverProc.killServerProc();
        }
        this.serverProc = null;
    }

    private serverIsAlive(): boolean {
        return this.serverProc && this.serverProc.isAlive();
    }
}

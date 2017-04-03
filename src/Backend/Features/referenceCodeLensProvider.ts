"use strict";

import * as vscode from "vscode";
import { CodeLens, Location, Position, Range, Uri } from "vscode";
/*import { ProcessWrapper } from "./../../Process/process";
import { Verification } from "./../../Strings/regexRessources";
import { encodeBase64 } from "./../../Strings/stringEncoding";
import { Environment } from "./../environment";*/
import { decodeBase64 } from "./../../Strings/stringEncoding";
import { ReferencesCodeLens } from "./baseCodeLensProvider";
import { DafnyBaseCodeLensProvider } from "./baseCodeLensProvider";
import {DafnyServer} from "../dafnyServer";

export class DafnyReferencesCodeLensProvider extends DafnyBaseCodeLensProvider {
    public constructor(server: DafnyServer) {
        super(server);
    }

    //private servers: ProcessWrapper[] = [];
    public provideReferenceInternal(codeLens: ReferencesCodeLens): Promise<ReferenceInformation[]> {
            return new Promise<ReferenceInformation[]>((resolve, reject) => {
                if(!codeLens.codeLensInfo) {
                    return resolve(null);
                }
                return this.askDafnyDefForReference(resolve, reject, null, codeLens);
        });
    }

    public resolveCodeLens(inputCodeLens: CodeLens): Promise<CodeLens> {
        const codeLens = inputCodeLens as ReferencesCodeLens;

        return this.provideReferenceInternal(codeLens).then((referenceInfo: ReferenceInformation[]) => {
            if (referenceInfo === null || referenceInfo === undefined) {
                return Promise.resolve(null);
            }
            const locations: Location[] = [];
            for(const info of referenceInfo) {
                locations.push(new Location(Uri.file(info.file), new Range(info.position.line, info.position.character,
                info.position.line, info.position.character + info.methodName.length)));
            }
            codeLens.command = {
                arguments: [codeLens.document, codeLens.range.start, locations],
                command: "editor.action.showReferences",
                title: locations.length === 1
                    ? "1 reference"
                    : `${locations.length} references`,
        };
            return codeLens;
        }, (err) => {
            codeLens.command = {
                command: "",
                title: "Could not determine references" + err
            };
            return codeLens;
        });
    }

private askDafnyDefForReference(resolve: any, reject: any, document: vscode.TextDocument, codeLens: ReferencesCodeLens) {
    this.server.addDocument(document, "symbols", (log) =>  {
            console.log(log);

            if(log.indexOf("SYMBOLS_START ") > -1) {
                const info = log.substring("SYMBOLS_START ".length, log.indexOf(" SYMBOLS_END"));
                console.log(info);
                const infos = this.parseReferenceResponse(log, codeLens.codeLensInfo.filePath);
                resolve(infos);
            }
            resolve(null);
        }, () => {reject(null)});
        /*const environment = new Environment();
        const command = environment.getStartDafnyCommand();
        const options = environment.getStandardSpawnOptions();
        const process = cp.spawn(command.command, command.args, options);
        const serverProc = new ProcessWrapper(process,
            (err: Error) => { this.handleProcessReferenceError(err); },
            () => {this.handleProcessReferenceData((data) => {
                if(!data) {
                    return reject(null);
                }
                return resolve(data);
            }, serverProc, codeLens.codeLensInfo.filePath); },
            () => { this.handleProcessReferenceExit(); },
            Verification.commandEndRegexDafnyServer
        );

        this.servers.push(serverProc);
        const task: ReferenceTask = {
            args: [codeLens.codeLensInfo.module, codeLens.codeLensInfo.parentClass, codeLens.codeLensInfo.symbol],
            fileName: codeLens.codeLensInfo.filePath,
            filename: codeLens.codeLensInfo.filePath,
            source: codeLens.source,
            sourceIsFile: false
        };
        try {
            const encoded = encodeBase64(task);
            serverProc.writeReferenceRequestToDafnyServer(encoded);
            serverProc.clearBuffer();
        } catch(exception) {
            console.error("Unable to encode request: " + exception);
        }*/

        //findReferences
    }

    /*private handleProcessReferenceError(err: Error): void {
        window.showErrorMessage("DafnyDef process " + this.serverProc.pid + " error: " + err);
        console.error("dafny server stdout error:" + err.message);
    }

    private handleProcessReferenceData(callback: (data: any) => any, serverProc: any, file: string): void {
        console.log(serverProc.outBuf);
        const log: string = serverProc.outBuf.substr(0, serverProc.positionCommandEnd());
        if(serverProc.outBuf.indexOf("REFERENCE_START") > -1) {
            const info = serverProc.outBuf.substring("REFERENCE_START".length, serverProc.outBuf.indexOf("REFERENCE_END"));
            console.log(info);
            try {
                const referenceInfo = this.parseReferenceResponse(info, file);
                console.log(referenceInfo);
                serverProc.clearBuffer();
                if(referenceInfo) {
                    callback(referenceInfo);
                } else {
                    callback(null);
                }
            } catch(exception) {
                console.error("Unable to parse response: " + exception);
                callback(null);
            }
        }
        console.log(log);
        this.serverProc.clearBuffer();
    }

    
    private handleProcessReferenceExit() {
        if(this.serverForReferenceIsAlive()) {
            this.serverProc.killServerProc();
        }
        this.serverProc = null;
    }

    private serverForReferenceIsAlive(): boolean {
        return this.serverProc && this.serverProc.isAlive();
    }*/

    private parseReferenceResponse(response: string, file: string): ReferenceInformation[] {
        const responseJson =  decodeBase64(response);
        const references: ReferenceInformation[] = [];
        if(responseJson && responseJson.length && responseJson.length > 0) {
            for(const reference of responseJson) {
                references.push(new ReferenceInformation(reference, file));
            }
        }
        return references;
    }

}

export class ReferenceInformation {
    public file: string;
    public methodName: string;
    public loc: number;
    public position: Position;
    constructor(dafnyReference: any, file: string) {
         if(dafnyReference) {
            this.methodName = dafnyReference.MethodName;
            this.loc = dafnyReference.Position;
            const line = parseInt(dafnyReference.Line, 10) - 1; // 1 based
            const column = Math.max(0, parseInt(dafnyReference.Column, 10) - 1); // ditto, but 0 can appear in some cases
            this.position = new Position(line, column);
            this.file = file;
        }
    }
}

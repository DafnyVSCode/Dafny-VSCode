
"use strict";

import * as cp from "child_process";
import { CodeLens, Location, Range, Uri, window } from "vscode";
import { ProcessWrapper } from "./../../Process/process";
import { Verification } from "./../../Strings/regexRessources";
import { encodeBase64 } from "./../../Strings/stringEncoding";
import { decodeBase64 } from "./../../Strings/stringEncoding";
//import { EnvironmentConfig } from "./../../Strings/stringRessources";
import { Environment } from "./../environment";
import { ReferencesCodeLens } from "./baseCodeLensProvider";
import { DafnyBaseCodeLensProvider } from "./baseCodeLensProvider";

export class DafnyReferencesCodeLensProvider extends DafnyBaseCodeLensProvider {
    private servers: ProcessWrapper[] = [];
    public provideReferenceInternal(codeLens: ReferencesCodeLens): Promise<ReferenceInformation[]> {
            return new Promise<ReferenceInformation[]>((resolve, reject) => {
                if(!codeLens.file || !codeLens.symbol) {
                    return resolve(null);
                }
                return this.askDafnyDefForReference(resolve, reject, codeLens);
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
                locations.push(new Location(Uri.parse(info.file), new Range(info.line, info.column,
                info.line, info.column + info.methodName.length)));
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

private askDafnyDefForReference(resolve: any, reject: any, codeLens: ReferencesCodeLens) {
        const environment = new Environment();
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
            }, serverProc, codeLens.file); },
            () => { this.handleProcessReferenceExit(); },
            Verification.commandEndRegexDafnyServer
        );

        this.servers.push(serverProc);
        const task: ReferenceTask = {
            args: [codeLens.module, codeLens.parentClass, codeLens.symbol],
            fileName: codeLens.file,
            filename: codeLens.file,
            source: codeLens.source,
            sourceIsFile: false
        };
        const encoded = encodeBase64(task);
        serverProc.writeReferenceRequestToDafnyServer(encoded);
    }

    private handleProcessReferenceError(err: Error): void {
        window.showErrorMessage("DafnyDef process " + this.serverProc.pid + " error: " + err);
        console.error("dafny server stdout error:" + err.message);
    }

    private handleProcessReferenceData(callback: (data: any) => any, serverProc: any, file: string): void {
        console.log(serverProc.outBuf);
        const log: string = serverProc.outBuf.substr(0, serverProc.positionCommandEnd());
        if(serverProc.outBuf.indexOf("REFERENCE_START") > -1) {
            const info = serverProc.outBuf.substring("REFERENCE_START".length, serverProc.outBuf.indexOf("REFERENCE_END"));
            console.log(info);
            const referenceInfo = this.parseReferenceResponse(info, file);
            console.log(referenceInfo);
            serverProc.clearBuffer();

            if(referenceInfo) {
                callback(referenceInfo);
            } else {
                callback(null);
            }
        }
/*        if(log && log.indexOf(EnvironmentConfig.DafnyDefSuccess) > 0 && log.indexOf(EnvironmentConfig.DafnyDefFailure) < 0) {
            const referenceResponse = log.substring(0, log.indexOf("[SUCCESS]"));
            const referenceInfo = this.parseReferenceResponse(
                referenceResponse.substring("REFERENCE_START".length, referenceResponse.indexOf("REFERENCE_END")));
            if(referenceInfo) {
                callback(referenceInfo);
            } else {
                callback(null);
            }
        }*/
        console.log(log);
        this.serverProc.clearBuffer();
    }

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
    private handleProcessReferenceExit() {
        if(this.serverForReferenceIsAlive()) {
            this.serverProc.killServerProc();
        }
        this.serverProc = null;
    }

    private serverForReferenceIsAlive(): boolean {
        return this.serverProc && this.serverProc.isAlive();
    }

}

export class ReferenceInformation {
    public file: string;
    public line: number;
    public methodName: string;
    public position: number;
    public column: number;

    constructor(dafnyReference: any, file: string) {
         if(dafnyReference) {
            this.methodName = dafnyReference.MethodName;
            this.position = dafnyReference.Position;
            this.line = parseInt(dafnyReference.Line, 10) - 1; // 1 based
            this.column = Math.max(0, parseInt(dafnyReference.Column, 10) - 1); // ditto, but 0 can appear in some cases
            this.file = file;
        }
    }
}

interface ReferenceTask {
    args: string[];
    fileName: string;
    filename: string;
    source: string;
    sourceIsFile: boolean;
}

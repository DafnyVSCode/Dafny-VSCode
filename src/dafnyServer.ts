"use strict";
import { Command } from "./Environment";
import { Environment } from "./Environment";
import { Strings } from "./stringRessources";

import * as vscode from "vscode";
import {Statusbar} from "./dafnyStatusbar";
import {VerificationRequest} from "./VerificationRequest";
import {Context} from "./Context";
import * as cp from "child_process";
import * as b64 from "base64-js";
import * as utf8 from "utf8";

// see DafnyServer/VerificationTask.cs in Dafny sources
// it is very straightforwardly JSON serialized/deserialized
export interface IVerificationTask {
    args: string[]; // for the verifier itself; consult Dafny sources
    filename: string; // need not be an actual file
    source: string; // actual document source
    sourceIsFile: boolean; // always set to false for our purposes
}

export class DafnyServer {
    // the dafny server runs as a child process (either through mono or .net)
    // ipc is done through stdin/stdout of the server process
    private serverProc: cp.ChildProcess = null;
    private outBuf: string = ""; // stdout accumulator
    private active: boolean = false;

    constructor(private statusbar: Statusbar, private context: Context) {    }

        public reset(): boolean {
        if (this.serverProc !== null) {
            this.killServerProc();
        }

        this.clearContext();

        this.statusbar.changeServerStatus(Strings.Starting);

        const environment: Environment = new Environment();
        const dafnyCommand: Command = environment.GetStartDafnyCommand();

        if(environment.usesMono && environment.hasCustomMonoPath) {
            vscode.window.showWarningMessage(Strings.MonoPathWrong);
        }
        if(dafnyCommand.notFound) {
            vscode.window.showErrorMessage(Strings.NoMono);
            return false;
        }

        const options: cp.SpawnOptions = {};
        if (vscode.workspace.rootPath) {
            options.cwd = vscode.workspace.rootPath;
        }
        options.stdio = [
            "pipe", // stdin
            "pipe", // stdout
            0, // ignore stderr
        ];
        return this.resetServerProc(dafnyCommand, options);
    }

    public isRunning(): boolean {
        // todo: better process handling
        return this.serverProc ? true : false;
    }

    public isActive(): boolean {
        return this.context.activeRequest ? true : false;
    }

    public pid(): number {
        return this.serverProc ? this.serverProc.pid : -1;
    }

    public addDocument(doc: vscode.TextDocument): void {

        const docName: string = doc.fileName;
        const request: VerificationRequest = new VerificationRequest(doc.getText(), doc);

        this.context.queue.enqueue(request);
        this.sendNextRequest();
    }

    private killServerProc(): void {
        // detach old callback listeners - this is done to prevent a spurious 'end' event response
        this.serverProc.stdout.removeAllListeners();
        this.serverProc.removeAllListeners();
        this.serverProc.kill();
        // this.serverProc.disconnect(); //TODO: this fails, needs testing without //don't listen to messages any more
        this.serverProc = null;        
    }

    private clearContext(): void {
        this.context.queue.clear();
        this.context.activeRequest = null;
        this.context.serverpid = null;
    }

    private resetServerProc(dafnyCommand: Command, options: cp.SpawnOptions): boolean {
        this.serverProc = cp.spawn(dafnyCommand.command, dafnyCommand.args, options);

        if (this.serverProc.pid) {
            this.context.serverpid = this.serverProc.pid;
            this.statusbar.changeServerStatus(Strings.Idle);

            this.serverProc.stdout.on("error", (err: Error) => {
                vscode.window.showErrorMessage("DafnyServer process " + this.serverProc.pid + " error: " + err);
                console.error("dafny server stdout error:" + err.message);
            });

            this.serverProc.stdout.on("data", (data: Buffer) => {
                this.outBuf += data.toString();
                this.gotData();
            });

            this.serverProc.on("exit", () => {
                this.serverProc = null;
                vscode.window.showErrorMessage(Strings.DafnyServerRestart);

                const crashedRequest = this.context.activeRequest;
                this.clearContext();
                this.context.verificationResults.addCrashed(crashedRequest);

                setTimeout(() => {
                    if (this.reset()) {
                        vscode.window.showInformationMessage(Strings.DafnyServerRestartSucceded);
                    } else {
                        vscode.window.showErrorMessage(Strings.DafnyServerRestartFailed);
                    }
                }, 1000);
                this.statusbar.update();
            });

            this.statusbar.update();
            return true;
        } else {
            this.statusbar.update();
            vscode.window.showErrorMessage(Strings.DafnyServerWrongPath);
            return false;
        }
    }

    private EncodeBase64(task: IVerificationTask): string {
        const jsonString: string = JSON.stringify(task);
        const bytesString: string = utf8.encode(jsonString);
        const bytes: Uint8Array = new Uint8Array(bytesString.length);
        for (let bi: number = 0; bi < bytesString.length; bi++) {
            const byte: number = bytesString.charCodeAt(bi);
            if (byte < 0 || byte > 255) {
                throw "should be in single byte range";
            }
            bytes[bi] = byte;
        }
        return b64.fromByteArray(bytes);
    }

    private sendVerificationRequest(request: VerificationRequest): void {
        this.statusbar.changeServerStatus(Strings.Verifying);
        const task: IVerificationTask = {
            args: [],
            filename: request.document.fileName,
            source: request.source,
            sourceIsFile: false
        };

        const encoded: string = this.EncodeBase64(task);
        this.outBuf = ""; // clear all output
        
        this.WriteVerificationRequestToServer(encoded);
        request.timeSent = Date.now();
    }

    private WriteVerificationRequestToServer(request: string): void {
    
        let good: boolean = this.serverProc.stdin.write("verify\n", () => { // the verify command
            if (!good) {
                throw "not good";
            }
            good = this.serverProc.stdin.write(request + "\n", () => { // the base64 encoded task
                if (!good) {
                    throw "not good";
                }
                good = this.serverProc.stdin.write("[[DAFNY-CLIENT: EOM]]\n", () => { // the client end of message marker
                    if (!good) {
                        throw "not good";
                    }
                });
            });
        });
    }

    private gotData(): void {
        const endId: number = this.outBuf.search(/\[\[DAFNY-SERVER: EOM\]\]/);
        if (endId !== -1) {
            this.context.activeRequest.timeFinished = Date.now();
            // parse output
            const log: string = this.outBuf.substr(0, endId);
            console.log(log);
            this.context.verificationResults.collect(log, this.context.activeRequest);
            this.context.activeRequest = null;
            this.outBuf = "";
            this.statusbar.update();
        }
        this.statusbar.changeServerStatus(Strings.Idle);
        this.active = false;
        this.sendNextRequest();
    }

    private sendNextRequest(): void {

        if(!this.active && (this.context.activeRequest === null)) {
            if(this.context.queue.peek() != null) {
                this.active = true;
                let request = this.context.queue.dequeue();
                this.context.activeRequest = request;
                this.sendVerificationRequest(request);
            }
        }
    }
}

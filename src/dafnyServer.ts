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
    private intervalTimer: NodeJS.Timer = null;

    constructor(private statusbar : Statusbar, private context : Context) {
        // run timerCallback every now and then to see if there's a queued verification request
        //this.intervalTimer = setInterval(this.timerCallback.bind(this), 250);
    }

    private killServerProc(): void {
        // detach old callback listeners - this is done to prevent a spurious 'end' event response
        this.serverProc.stdout.removeAllListeners();
        this.serverProc.removeAllListeners();
        this.serverProc.kill();
        // this.serverProc.disconnect(); //TODO: this fails, needs testing without //don't listen to messages any more
        this.serverProc = null;
    }
    public reset(): boolean {
        if (this.serverProc !== null) {
            this.killServerProc();
        }
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

    private resetServerProc(dafnyCommand: Command, options: cp.SpawnOptions): boolean {
        this.serverProc = cp.spawn(dafnyCommand.command, dafnyCommand.args, options);

        if (this.serverProc.pid) {
            this.statusbar.pid = this.serverProc.pid;
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
                this.statusbar.pid = null;
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

    public isRunning(): Boolean {
        // todo: better process handling
        return this.serverProc ? true : false;
    }

    public isActive(): Boolean {
        return this.context.activeRequest ? true : false;
    }

    public pid(): Number {
        return this.serverProc ? this.serverProc.pid : -1;
    }

    public addDocument(doc: vscode.TextDocument): void {

        const docName: string = doc.fileName;
        const request: VerificationRequest = new VerificationRequest(doc.getText(), doc);

        if (this.context.activeRequest !== null && this.context.queuedRequests[docName] === this.context.activeRequest) {
            throw "active document must not be also in queue";
        }

        if (this.context.activeRequest === null && this.isRunning()) {
            // ignore the queued request (if any) and run the new request directly
            this.context.activeRequest = request;
            this.context.queuedRequests[docName] = null;
            this.sendVerificationRequest(this.context.activeRequest);
        } else {
            // overwrite any older requests as this is more up to date
            this.context.queuedRequests[docName] = request;
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
            filename: request.doc.fileName,
            source: request.src,
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
    }

    private timerCallback(): void {
        if (this.context.activeRequest === null && this.isRunning()) {
            // see if there are documents that were recently modified

            // todo: what does this code do
            /*for (var ti in this.docChangeTimers) {
                let rec = this.docChangeTimers[ti];
                if (rec.active && (now - rec.lastChange < this.docChangeDelay)) {
                    if (rec.doc === vscode.window.activeTextEditor.document) {
                        this.currentDocStatucBarTxt.text = "$(radio-tower)Verification request sent";
                    }
                    this.queuedRequests[ti] = new VerificationRequest(rec.doc.getText(), rec.doc);
                    rec.active = false;
                }
            }*/

            // schedule the oldest request first
            let oldestRequest: VerificationRequest = null;
            let oldestName: string = null;
            // tslint:disable-next-line:forin
            for (var docPathName in this.context.queuedRequests) {
                var request: VerificationRequest = this.context.queuedRequests[docPathName];
                if (request) {
                    if (!oldestRequest || oldestRequest.timeCreated > request.timeCreated) {
                        oldestRequest = request;
                        oldestName = docPathName;
                    }
                }
            }

            if (oldestRequest) {
                if (oldestRequest.doc === vscode.window.activeTextEditor.document) {
                    // this.currentDocStatucBarTxt.text = "$(beaker)Verifying..";
                }

                this.context.queuedRequests[oldestName] = null;
                // this.statusbar.changeQueueSize(this.remainingRequests());
                this.context.activeRequest = oldestRequest;
                this.sendVerificationRequest(oldestRequest);
            }
        }
        this.statusbar.update();
    }
}

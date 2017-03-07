"use strict";
// the module 'vscode' contains the VS Code extensibility API
// import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {Statusbar} from "./dafnyStatusbar";
import {VerificationRequest} from "./VerificationRequest";
import {Context} from "./Context";

import * as cp from "child_process";
import * as os from "os";

// external
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
        this.intervalTimer = setInterval(this.timerCallback.bind(this), 250);
    }

    // todo: requirement check in a separat class
    private testCommand(path: string): boolean {
        let proc: cp.ChildProcess = cp.exec(path);
        let good: boolean = proc.pid !== 0;
        if (good) {
            proc.kill();
        }
        return good;
    }

    public reset(): boolean {
        if (this.serverProc !== null) {
            // detach old callback listeners - this is done to prevent a spurious 'end' event response
            this.serverProc.stdout.removeAllListeners();
            this.serverProc.removeAllListeners();

            this.serverProc.kill();
            // this.serverProc.disconnect(); //TODO: this fails, needs testing without //don't listen to messages any more
            this.serverProc = null;
        }

        this.statusbar.changeServerStatus("Starting");

        let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("dafny");
        let useMono: boolean = config.get<boolean>("useMono") || os.platform() !== "win32"; // setting only relevant on windows
        let monoPath: string = config.get<string>("monoPath");
        let hasCustomMonoPath: boolean = monoPath !== "";
        let dafnyServerPath: string = config.get<string>("dafnyServerPath");

        let command: string;
        let args: string[];

        if (!useMono) {
            command = dafnyServerPath;
            args = [];
        } else {
            // see if mono is in PATH
            let monoInSystemPath: boolean = this.testCommand("mono");

            // now test specific path
            let monoAtConfigPath: boolean = hasCustomMonoPath && this.testCommand(monoPath);

            if (monoInSystemPath && !monoAtConfigPath) {
                if (hasCustomMonoPath) {
                    vscode.window.showWarningMessage("dafny.monoPath set incorrectly; found mono in system PATH and will use it");
                }
                monoPath = "mono";
            } else if (!monoInSystemPath && !monoAtConfigPath) {
                vscode.window.showErrorMessage("Could not find mono, neither in system PATH nor at dafny.monoPath");
                return false; // failed to start DafnyServer
            }

            command = monoPath;
            args = [dafnyServerPath];
        }

        let opts: cp.SpawnOptions = {};
        if (vscode.workspace.rootPath) {
            opts.cwd = vscode.workspace.rootPath;
        }
        opts.stdio = [
            "pipe", // stdin
            "pipe", // stdout
            0, // ignore stderr
        ];


        this.serverProc = cp.spawn(command, args, opts);

        if (this.serverProc.pid) {
            this.statusbar.pid = this.serverProc.pid;
            this.statusbar.changeServerStatus("$(clock) Idle");

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
                vscode.window.showErrorMessage("DafnyServer process quit unexpectedly; attempting restart");
                this.statusbar.pid = null;
                setTimeout(() => {
                    if (this.reset()) {
                        vscode.window.showInformationMessage("DafnyServer restart succeeded");
                    } else {
                        vscode.window.showErrorMessage("DafnyServer restart failed");
                    }
                }, 1000);
                this.statusbar.update();
            });

            this.statusbar.update();
            return true;
        } else {
            this.statusbar.update();
            vscode.window.showErrorMessage("failed to start DafnyServer, check paths in config");
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

        let docName: string = doc.fileName;
        let req: VerificationRequest = new VerificationRequest(doc.getText(), doc);

        if (this.context.activeRequest !== null && this.context.queuedRequests[docName] === this.context.activeRequest) {
            throw "active document must not be also in queue";
        }

        if (this.context.activeRequest === null && this.isRunning()) {
            // ignore the queued request (if any) and run the new request directly
            this.context.activeRequest = req;
            this.context.queuedRequests[docName] = null;
            this.sendVerificationRequest(this.context.activeRequest);
        } else {
            // overwrite any older requests as this is more up to date
            this.context.queuedRequests[docName] = req;
        }
    }


    private sendVerificationRequest(req: VerificationRequest): void {
        this.statusbar.changeServerStatus("$(beaker) Verifying");
        // base64 encode a json encoded DafnyServer.VerificationTask object
        let task: IVerificationTask = {
            args: [],
            filename: req.doc.fileName,
            source: req.src,
            sourceIsFile: false
        };

        let jsonString: string = JSON.stringify(task);
        let bytesStr: string = utf8.encode(jsonString);

        let bytes: Uint8Array = new Uint8Array(bytesStr.length);
        for (let bi: number = 0; bi < bytesStr.length; bi++) {
            let byte: number = bytesStr.charCodeAt(bi);
            if (byte < 0 || byte > 255) {
                throw "should be in single byte range";
            }
            bytes[bi] = byte;
        }

        let encoded: string = b64.fromByteArray(bytes);

        this.outBuf = ""; // clear all output

        // write 3 lines in sequence
        let good: boolean = this.serverProc.stdin.write("verify\n", () => { // the verify command
            if (!good) {
                throw "not good";
            }
            good = this.serverProc.stdin.write(encoded + "\n", () => { // the base64 encoded task
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

        req.timeSent = Date.now();
    }

    private gotData(): void {
        let endId: number = this.outBuf.search(/\[\[DAFNY-SERVER: EOM\]\]/);
        if (endId !== -1) {
            this.context.activeRequest.timeFinished = Date.now();
            // parse output
            let log: string = this.outBuf.substr(0, endId);
            console.log(log);

            this.context.verificationResults.collect(log, this.context.activeRequest);

            this.context.activeRequest = null;
            this.outBuf = "";

            this.statusbar.update();
        }

        this.statusbar.changeServerStatus("$(clock) Idle");
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
            let oldest: VerificationRequest = null;
            let oldestName: string = null;
            // tslint:disable-next-line:forin
            for (var ni in this.context.queuedRequests) {
                var req: VerificationRequest = this.context.queuedRequests[ni];
                if (req) {
                    if (!oldest || oldest.timeCreated > req.timeCreated) {
                        oldest = req;
                        oldestName = ni;
                    }
                }
            }

            if (oldest) {
                if (oldest.doc === vscode.window.activeTextEditor.document) {
                    // this.currentDocStatucBarTxt.text = "$(beaker)Verifying..";
                }

                this.context.queuedRequests[oldestName] = null;
                // this.statusbar.changeQueueSize(this.remainingRequests());
                this.context.activeRequest = oldest;
                this.sendVerificationRequest(oldest);
            }
        }
        this.statusbar.update();
    }
}

"use strict";
import * as cp from "child_process";
import * as vscode from "vscode";
import {Context} from "./Context";
import {Statusbar} from "./dafnyStatusbar";
import { EncodeBase64 } from "./Encoding/stringEncoding";
import { Command } from "./Environment";
import { Environment } from "./Environment";
import { ProcessWrapper } from "./Process/process";
import { Strings } from "./stringRessources";
import {VerificationRequest} from "./VerificationRequest";
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
    private active: boolean = false;
    private serverProc: ProcessWrapper;
    constructor(private statusbar: Statusbar, private context: Context) {    }

    public reset(): boolean {
        if(this.serverProc && this.serverProc.isAlive()) {
            this.serverProc.killServerProc();
            this.serverProc = null;
        }

        this.clearContext();

        this.statusbar.changeServerStatus(Strings.Starting);

        const environment: Environment = new Environment();
        const dafnyCommand: Command = environment.GetStartDafnyCommand();

        if (environment.UsesNonStandardMonoPath()) {
            vscode.window.showWarningMessage(Strings.MonoPathWrong);
        }

        if (dafnyCommand.notFound) {
            vscode.window.showErrorMessage(Strings.NoMono);
            return false;
        }
        return this.resetServerProc(dafnyCommand, environment.GetStandardSpawnOptions());
    }

    public isRunning(): boolean {
        // todo: better process handling
        return this.serverProc && this.serverProc.isAlive();
    }

    public isActive(): boolean {
        return this.context.activeRequest ? true : false;
    }

    public pid(): number {
        return this.serverProc ? this.serverProc.pid : -1;
    }

    public addDocument(doc: vscode.TextDocument): void {
        const request: VerificationRequest = new VerificationRequest(doc.getText(), doc);

        this.context.queue.enqueue(request);
        this.sendNextRequest();
    }

    private clearContext(): void {
        this.context.queue.clear();
        this.context.activeRequest = null;
        this.context.serverpid = null;
    }
    private handleProcessError(err: Error): void {
        vscode.window.showErrorMessage("DafnyServer process " + this.serverProc.pid + " error: " + err);
        console.error("dafny server stdout error:" + err.message);
    }
    private handleProcessExit() {
        this.serverProc = null;
        vscode.window.showErrorMessage(Strings.DafnyServerRestart);

        const crashedRequest: VerificationRequest = this.context.activeRequest;
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
    }
    private resetServerProc(dafnyCommand: Command, options: cp.SpawnOptions): boolean {
        try {
            const spawnOptions = cp.spawn(dafnyCommand.command, dafnyCommand.args, options);
            this.serverProc = new ProcessWrapper(spawnOptions,
                (err: Error) => { this.handleProcessError(err); },
                () => {this.gotData(); },
                () => { this.handleProcessExit(); });
            this.context.serverpid = this.serverProc.pid;
            this.statusbar.changeServerStatus(Strings.Idle);
            this.statusbar.update();
            return true;
        } catch(e) {
            this.statusbar.update();
            vscode.window.showErrorMessage(Strings.DafnyServerWrongPath);
            return false;
        }
    }

    private sendVerificationRequest(request: VerificationRequest): void {
        this.statusbar.changeServerStatus(Strings.Verifying);
        const task: IVerificationTask = {
            args: [],
            filename: request.document.fileName,
            source: request.source,
            sourceIsFile: false
        };
        const encoded: string = EncodeBase64(task);
        if(this.serverProc && this.serverProc.isAlive()) {
            this.serverProc.outBuf = "";
        }
        this.WriteVerificationRequestToServer(encoded);
        request.timeSent = Date.now();
    }

    private WriteVerificationRequestToServer(request: string): void {
        this.serverProc.WriteVerificationRequestToServer(request);
    }

    private gotData(): void {
        const endId: number = this.serverProc ? this.serverProc.outBuf.search(/\[\[DAFNY-SERVER: EOM\]\]/) : -1;
        if (endId !== -1) {
            this.context.activeRequest.timeFinished = Date.now();
            // parse output
            const log: string = this.serverProc.outBuf.substr(0, endId);
            console.log(log);
            this.context.verificationResults.collect(log, this.context.activeRequest);
            this.context.activeRequest = null;
            this.serverProc.outBuf = "";
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
                const request: VerificationRequest = this.context.queue.dequeue();
                this.context.activeRequest = request;
                this.sendVerificationRequest(request);
            }
        }
    }
}

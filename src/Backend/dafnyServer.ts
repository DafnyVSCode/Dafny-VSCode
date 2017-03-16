"use strict";
import * as cp from "child_process";
import * as vscode from "vscode";
import {IncorrectPathExeption} from "../ErrorHandling/errors";
import {Statusbar} from "../Frontend/dafnyStatusbar";
import { ProcessWrapper } from "../Process/process";
import { EncodeBase64 } from "../Strings/stringEncoding";
import { ErrorMsg, InfoMsg, ServerStatus, StatusString, WarningMsg } from "../Strings/stringRessources";
import {Context} from "./context";
import { Command } from "./environment";
import { Environment } from "./environment";
import {VerificationRequest} from "./verificationRequest";

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
    private MAX_RETRIES: number = 5;
    private active: boolean = false;
    private serverProc: ProcessWrapper;
    private restart: boolean = true;
    private retries: number = 0;

    constructor(private statusbar: Statusbar, private context: Context) {    }

    public reset(): boolean {
        if(this.isRunning()) {
            this.serverProc.killServerProc();
            this.serverProc = null;
        }
        this.context.clear();
        this.statusbar.changeServerStatus(ServerStatus.Starting);
        if(this.restart) {
            return this.resetProcess();
        } else {
            return true;
        }
    }

    public verify(): boolean {
        const environment: Environment = new Environment();
        const dafnyCommand: Command = environment.GetStartDafnyCommand();
        try {
            this.serverProc = this.spawnNewProcess(dafnyCommand, environment.GetStandardSpawnOptions());
            return true;
        } catch(e) {
            return false;
        }
    }

    public isRunning(): boolean {
        return this.serverProc && this.serverProc.isAlive();
    }

    public pid(): number {
        return this.isRunning() ? this.serverProc.pid : -1;
    }

    public addDocument(doc: vscode.TextDocument): void {
        const request: VerificationRequest = new VerificationRequest(doc.getText(), doc);
        this.context.enqueueRequest(request);
        this.sendNextRequest();
    }

    public setInactive(): void {
        this.active = false;
    }

    public stop(): void {
        this.restart = false;
        this.active = false;
        this.reset();
    }

    private resetProcess(): boolean {
        const environment: Environment = new Environment();
        const dafnyCommand: Command = environment.GetStartDafnyCommand();

        if (environment.UsesNonStandardMonoPath()) {
            vscode.window.showWarningMessage(WarningMsg.MonoPathWrong);
        }

        if (dafnyCommand.notFound) {
            vscode.window.showErrorMessage(ErrorMsg.NoMono);
            return false;
        }
        return this.resetServerProc(dafnyCommand, environment.GetStandardSpawnOptions());
    }

    private handleProcessError(err: Error): void {
        vscode.window.showErrorMessage("DafnyServer process " + this.serverProc.pid + " error: " + err);
        console.error("dafny server stdout error:" + err.message);
    }

    private handleProcessData(): void {
        if (this.isRunning() && this.serverProc.commandFinished()) {
            // parse output
            const log: string = this.serverProc.outBuf.substr(0, this.serverProc.positionCommandEnd());
            console.log(log);
            this.context.collectRequest(log);
            this.serverProc.clearBuffer();
            this.statusbar.update();
        }
        this.statusbar.changeServerStatus(StatusString.Idle);
        this.active = false;
        this.sendNextRequest();
    }

    private handleProcessExit() {
        this.serverProc = null;
        vscode.window.showErrorMessage(ErrorMsg.DafnyServerRestart);

        const crashedRequest: VerificationRequest = this.context.activeRequest;
        this.context.clear();
        this.context.addCrashedRequest(crashedRequest);
        this.retries++;
        this.active = false;

        if(this.retries < this.MAX_RETRIES) {
            setTimeout(() => {
                if (this.reset()) {
                    vscode.window.showInformationMessage(InfoMsg.DafnyServerRestartSucceded);
                } else {
                    vscode.window.showErrorMessage(ErrorMsg.DafnyServerRestartFailed);
                }
            }, 1000);
        } else {
            this.retries = 0;
            vscode.window.showErrorMessage(ErrorMsg.MaxRetriesReached);
        }

        this.statusbar.update();
    }
    private resetServerProc(dafnyCommand: Command, options: cp.SpawnOptions): boolean {
        try {
            this.serverProc = this.spawnNewProcess(dafnyCommand, options);
            this.context.serverpid = this.serverProc.pid;
            this.statusbar.changeServerStatus(StatusString.Idle);
            this.statusbar.update();
            return true;
        } catch(e) {
            this.statusbar.update();
            this.active = false;
            vscode.window.showErrorMessage(ErrorMsg.DafnyServerWrongPath);
            throw new IncorrectPathExeption();
        }
    }

    private spawnNewProcess(dafnyCommand: Command, options: cp.SpawnOptions): ProcessWrapper {
        const process = cp.spawn(dafnyCommand.command, dafnyCommand.args, options);
        return new ProcessWrapper(process,
            (err: Error) => { this.handleProcessError(err); },
            () => {this.handleProcessData(); },
            () => { this.handleProcessExit(); });
    }

    private sendVerificationRequest(request: VerificationRequest): void {
        this.statusbar.changeServerStatus(StatusString.Verifying);
        const task: IVerificationTask = {
            args: [],
            filename: request.document.fileName,
            source: request.source,
            sourceIsFile: false
        };
        const encoded: string = EncodeBase64(task);
        if(this.isRunning()) {
            this.serverProc.clearBuffer();
            this.serverProc.WriteVerificationRequestToServer(encoded);
        }
        request.timeSent = Date.now();
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

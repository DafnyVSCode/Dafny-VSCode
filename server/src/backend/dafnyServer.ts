"use strict";
import * as cp from "child_process";
import {IConnection} from "vscode-languageserver";
import * as vscode from "vscode-languageserver";
import {IncorrectPathExeption} from "../errorHandling/errors";
import {Statusbar} from "../frontend/dafnyStatusbar";
import { ProcessWrapper } from "../process/process";
import { encodeBase64 } from "../strings/stringEncoding";
import { ErrorMsg, InfoMsg, ServerStatus, StatusString, WarningMsg, LanguageServerNotification, LanguageServerRequest } from "../strings/stringRessources";
import {Context} from "./context";
import { Command } from "./environment";
import { Environment } from "./environment";
//import { SymbolService } from "./features/symbolService";
import {VerificationRequest} from "./verificationRequest";
import {DafnySettings} from "./dafnySettings";

// see DafnyServer/VerificationTask.cs in Dafny sources
// it is very straightforwardly JSON serialized/deserialized
export interface IVerificationTask {
    args: string[];
    filename: string;
    source: string;
    sourceIsFile: boolean;
}

export class DafnyServer {
    //public symbolService: SymbolService;
    private MAX_RETRIES: number = 5;
    private active: boolean = false;
    private serverProc: ProcessWrapper;
    private restart: boolean = true;
    private retries: number = 0;
    constructor(private connection: IConnection, private statusbar: Statusbar, private context: Context, private settings: DafnySettings) {
        //this.symbolService = new SymbolService(this);
    }

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
        const environment: Environment = new Environment(this.context.rootPath, this.connection, this.settings);
        const dafnyCommand: Command = environment.getStartDafnyCommand();
        try {
            this.serverProc = this.spawnNewProcess(dafnyCommand, environment.getStandardSpawnOptions());
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

    public addDocument(doc: vscode.TextDocument, verb: string, callback?: ((data: any) => any), error?: ((data: any) => any)): void {
        const request: VerificationRequest = new VerificationRequest(doc.getText(), doc, verb, callback, error);
        this.context.enqueueRequest(request);
        this.connection.sendNotification(LanguageServerNotification.QueueSize, this.context.queue.size);
        this.sendNextRequest();
    }

    public setInactive(): void {
        this.active = false;
    }

    public init(): void {
        this.restart = true;
    }

    public stop(): void {
        this.restart = false;
        this.active = false;
        this.reset();
    }

    private resetProcess(): boolean {
        const environment: Environment = new Environment(this.context.rootPath, this.connection, this.settings);
        const dafnyCommand: Command = environment.getStartDafnyCommand();

        /*if (environment.usesNonStandardMonoPath()) {
            vscode.window.showWarningMessage(WarningMsg.MonoPathWrong);
        }*/

        if (dafnyCommand.notFound) {
            this.connection.sendNotification(LanguageServerNotification.Error, ErrorMsg.NoMono);
            return false;
        }
        return this.resetServerProc(dafnyCommand, environment.getStandardSpawnOptions());
    }

    private handleProcessError(err: Error): void {
        this.connection.sendNotification(LanguageServerNotification.Error, "DafnyServer process " + this.serverProc.pid + " error: " + err);
        console.error("dafny server stdout error:" + err.message);
        this.context.activeRequest.error(err);

        this.statusbar.changeServerStatus(StatusString.Idle);
        this.active = false;
        this.context.activeRequest = null;
        this.sendNextRequest();
    }

    private handleProcessData(): void {
        if (this.isRunning() && this.serverProc.commandFinished()) {
            const log: string = this.serverProc.outBuf.substr(0, this.serverProc.positionCommandEnd());
            console.log(this.serverProc.outBuf);
            if(this.context.activeRequest && this.context.activeRequest.verb === "verify") {
                const result = this.context.collectRequest(log);
                this.connection.sendNotification(LanguageServerNotification.VerificationResult,
                    [this.context.activeRequest.document.uri.toString(), JSON.stringify(result)]);
                this.context.activeRequest = null;
            } else if(this.context.activeRequest) {
                this.context.activeRequest.callback(log);
                this.context.activeRequest = null;
            } else {
                console.error("active request was null");
            }

            this.serverProc.clearBuffer();
            this.statusbar.changeServerStatus(StatusString.Idle);
            this.active = false;
            this.sendNextRequest();
        }
    }

    private handleProcessExit() {
        this.serverProc = null;
        this.connection.sendNotification(LanguageServerNotification.Error, ErrorMsg.DafnyServerRestart);
        if(this.context != null) {
            const crashedRequest: VerificationRequest = this.context.activeRequest;
            this.context.clear();
            this.context.addCrashedRequest(crashedRequest);
        } else {
            throw new IncorrectPathExeption();
        }
        this.retries++;
        this.active = false;

        if(this.retries < this.MAX_RETRIES) {
            setTimeout(() => {
                if (this.reset()) {
                    this.connection.sendNotification(LanguageServerNotification.Info, InfoMsg.DafnyServerRestartSucceded);
                } else {
                    this.connection.sendNotification(LanguageServerNotification.Error, ErrorMsg.DafnyServerRestartFailed);
                }
            }, 1000);
        } else {
            this.retries = 0;
            this.connection.sendNotification(LanguageServerNotification.Error, ErrorMsg.MaxRetriesReached);
        }

        //this.statusbar.update();
    }
    private resetServerProc(dafnyCommand: Command, options: cp.SpawnOptions): boolean {
        try {
            this.serverProc = this.spawnNewProcess(dafnyCommand, options);
            this.context.serverpid = this.serverProc.pid;
            this.statusbar.changeServerStatus(StatusString.Idle);
            this.connection.sendNotification(LanguageServerNotification.ServerStarted,
            [this.context.serverpid, this.context.serverversion]);
            this.connection.sendNotification(LanguageServerNotification.Ready);
            return true;
        } catch(e) {
            //this.statusbar.update();
            this.active = false;
            this.connection.sendNotification(LanguageServerNotification.Error, ErrorMsg.DafnyServerWrongPath);
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
        if(request.verb === "verify") {
            this.statusbar.changeServerStatus(StatusString.Verifying);
        }
        console.log("Sending: " + request);
        const task: IVerificationTask = {
            args: [],
            filename: request.document.uri,
            source: request.source,
            sourceIsFile: false
        };
        const encoded: string = encodeBase64(task);
        if(this.isRunning()) {
            this.serverProc.clearBuffer();
            this.serverProc.sendRequestToDafnyServer(encoded, request.verb);
        }
        this.connection.sendNotification(LanguageServerNotification.ActiveVerifiyingDocument, request.document.uri);
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

"use strict";
import * as cp from "child_process";
import * as vscode from "vscode-languageserver";
import Uri from "vscode-uri";
import { IncorrectPathExeption } from "../errors";
import { Statusbar } from "../frontend/dafnyStatusbar";
import { NotificationService } from "../notificationService";
import { ProcessWrapper } from "../process/process";
import { encodeBase64 } from "../strings/stringEncoding";
import { DafnyVerbs, ErrorMsg, InfoMsg, LanguageServerNotification, ServerStatus, StatusString } from "../strings/stringRessources";
import { Command } from "./Command";
import { Context } from "./context";
import { IDafnySettings } from "./dafnySettings";
import { Environment } from "./environment";
import { SymbolService } from "./features/symbolService";
import { VerificationRequest } from "./verificationRequest";

// see DafnyServer/VerificationTask.cs in Dafny sources
export interface IVerificationTask {
    args: string[];
    filename: string;
    source: string;
    sourceIsFile: boolean;
}

export class DafnyServer {
    public symbolService: SymbolService;
    private MAX_RETRIES: number = 5;
    private active: boolean = false;
    private serverProc: ProcessWrapper | undefined;
    private restart: boolean = true;
    private retries: number = 0;
    constructor(private notificationService: NotificationService, private statusbar: Statusbar,
                private context: Context, private settings: IDafnySettings) {
        this.symbolService = new SymbolService(this);
    }

    public reset(): boolean {
        if (this.serverProc && this.isRunning()) {
            this.serverProc.killServerProc();
            this.serverProc = undefined;
        }
        this.context.clear();
        if (this.restart) {
            this.statusbar.changeServerStatus(ServerStatus.Starting);
            return this.resetProcess();
        } else {
            this.statusbar.changeServerStatus(ServerStatus.Stopped);
            return true;
        }
    }

    public verify(): boolean {
        const environment: Environment = new Environment(this.context.rootPath, this.notificationService, this.settings);
        const dafnyCommand: Command = environment.getStartDafnyCommand();
        try {
            this.serverProc = this.spawnNewProcess(dafnyCommand, environment.getStandardSpawnOptions());
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    public isRunning(): boolean {
        return !!(this.serverProc) && this.serverProc.isAlive();
    }

    public pid(): number {
        return this.isRunning() ? this.serverProc!.pid : -1;
    }

    public addDocument(doc: vscode.TextDocument, verb: string, callback?: ((data: any) => any), error?: ((data: any) => any)): void {
        const request: VerificationRequest = new VerificationRequest(doc.getText(), doc, verb, callback, error);
        this.context.enqueueRequest(request);
        this.notificationService.sendQueueSize(this.context.queue.size());
        if (verb === LanguageServerNotification.CounterExample) {
            this.resetProcess();
        }
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
        const environment: Environment = new Environment(this.context.rootPath, this.notificationService, this.settings);
        const dafnyCommand: Command = environment.getStartDafnyCommand();

        if (dafnyCommand.notFound) {
            this.notificationService.sendError(ErrorMsg.NoMono);
            return false;
        }
        return this.resetServerProc(dafnyCommand, environment.getStandardSpawnOptions());
    }

    private handleProcessError(err: Error): void {
        this.notificationService.sendError(`DafnyServer process${this.serverProc!.pid} error: ${err}`);
        console.error(`dafny server stdout error: ${err.message}`);
        if (this.context && this.context.activeRequest && this.context.activeRequest.error) {
            this.context.activeRequest.error(err);
        }

        this.statusbar.changeServerStatus(StatusString.Idle);
        this.active = false;
        this.context.activeRequest = undefined;
        this.sendNextRequest();
    }

    private handleProcessData(): void {
        if (this.isRunning() && this.serverProc !== undefined && this.serverProc.commandFinished()) {
            const log: string = this.serverProc.outBuf.substr(0, this.serverProc.positionCommandEnd());
            if (this.context.activeRequest && (this.context.activeRequest.verb === DafnyVerbs.CounterExample
                || this.context.activeRequest.verb === DafnyVerbs.Verify)) {
                const result = this.context.collectRequest(log);
                this.notificationService.sendVerificationResult([this.context.activeRequest.document.uri.toString(),
                JSON.stringify(result)]);
                this.context.activeRequest = undefined;
            } else if (this.context.activeRequest) {
                if (this.context.activeRequest.callback) {
                    this.context.activeRequest.callback(log);
                }
                this.context.activeRequest = undefined;
            } else {
                console.error("active request was null");
            }

            this.serverProc.clearBuffer();
            this.statusbar.changeServerStatus(StatusString.Idle);
            this.notificationService.sendActiveVerifiyingDocument(null);
            this.active = false;
            this.sendNextRequest();
        }
    }

    private handleProcessExit() {
        this.serverProc = undefined;
        this.notificationService.sendError(ErrorMsg.DafnyServerRestart);
        if (this.context && this.context.activeRequest) {
            const crashedRequest: VerificationRequest = this.context.activeRequest;
            this.context.clear();
            this.context.addCrashedRequest(crashedRequest);
        } else {
            throw new IncorrectPathExeption();
        }
        this.retries++;
        this.active = false;

        if (this.retries < this.MAX_RETRIES) {
            setTimeout(() => {
                if (this.reset()) {
                    this.notificationService.sendInfo(InfoMsg.DafnyServerRestartSucceded);
                } else {
                    this.notificationService.sendError(ErrorMsg.DafnyServerRestartFailed);
                }
            }, 1000);
        } else {
            this.retries = 0;
            this.notificationService.sendError(ErrorMsg.MaxRetriesReached);
        }

        // this.statusbar.update();
    }
    private resetServerProc(dafnyCommand: Command, options: cp.SpawnOptions): boolean {
        try {
            this.serverProc = this.spawnNewProcess(dafnyCommand, options);
            this.context.serverpid = this.serverProc.pid;
            this.statusbar.changeServerStatus(StatusString.Idle);
            this.notificationService.sendServerStarted([this.context.serverpid, this.context.serverversion]);
            this.notificationService.sendReady();
            return true;
        } catch (e) {
            // this.statusbar.update();
            this.active = false;
            this.notificationService.sendError(ErrorMsg.DafnyServerWrongPath);
            throw new IncorrectPathExeption();
        }
    }

    private spawnNewProcess(dafnyCommand: Command, options: cp.SpawnOptions): ProcessWrapper {
        const process = cp.spawn(dafnyCommand.command, dafnyCommand.args, options);
        return new ProcessWrapper(process,
            (err: Error) => { this.handleProcessError(err); },
            () => { this.handleProcessData(); },
            () => { this.handleProcessExit(); });
    }

    private sendVerificationRequest(request: VerificationRequest): void {
        if (request.verb === DafnyVerbs.CounterExample || request.verb === DafnyVerbs.Verify) {
            this.statusbar.changeServerStatus(StatusString.Verifying);
        }
        const task: IVerificationTask = {
            args: this.settings.serverVerifyArguments,
            filename: Uri.parse(request.document.uri).fsPath,
            source: request.source,
            sourceIsFile: false,
        };
        const encoded: string = encodeBase64(task);
        if (this.serverProc && this.isRunning()) {
            this.serverProc.clearBuffer();
            this.serverProc.sendRequestToDafnyServer(encoded, request.verb);
        }
        this.notificationService.sendActiveVerifiyingDocument(request.document.uri);
        request.timeSent = Date.now();
    }

    private sendNextRequest(): void {
        if (!this.active && (this.context.activeRequest === undefined)) {
            if (this.context.queue.peek()) {
                this.active = true;
                const request: VerificationRequest = this.context.queue.dequeue()!;
                this.notificationService.sendQueueSize(this.context.queue.size());
                this.context.activeRequest = request;
                this.sendVerificationRequest(request);
            }
        }
    }
}

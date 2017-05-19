"use strict";

import * as cp from "child_process";
import { NotificationService } from "../notificationService";
import { ProcessWrapper } from "../process/process";
import { DafnySettings } from "./dafnySettings";
import { Command } from "./environment";
import { Environment } from "./environment";

export class DependencyVerifier {

    private upgradeNecessary = "UPDATE_NECESSARY";
    private latestInstalled = "Latest version installed";
    private version = "VERSION:";

    private serverProc: ProcessWrapper;
    private callbackSuccess: (serverVersion: string) => any;
    private callbackError: (error: any) => any;
    private upgradeCallback: () => any;
    private serverVersion: string;

    public verifyDafnyServer(rootPath: string, notificationService: NotificationService, dafnySettings: DafnySettings,
        callbackSuccess: (serverVersion: string) => any, callbackError: (error: any) => any) {
        const environment: Environment = new Environment(rootPath, notificationService, dafnySettings);
        const spawnOptions = environment.getStandardSpawnOptions();
        const dafnyCommand: Command = environment.getStartDafnyCommand();
        this.callbackError = callbackError;
        this.callbackSuccess = callbackSuccess;

        this.verify(dafnyCommand, spawnOptions);
    }

    private verify(command: Command, spawnOptions: cp.SpawnOptions): void {
        try {
            this.serverProc = this.spawnNewProcess(command, spawnOptions);
            this.serverProc.sendRequestToDafnyServer("", "version");
        } catch (e) {
            this.callbackError(e);
        }
    }

    private spawnNewProcess(dafnyCommand: Command, options: cp.SpawnOptions): ProcessWrapper {
        const process = cp.spawn(dafnyCommand.command, dafnyCommand.args, options);
        process.on("error", (e) => { this.callbackError(e); });
        process.on("exit", (e) => { this.handleProcessExit(e); });
        process.stdin.on("error", (e) => { this.callbackError(e); });

        return new ProcessWrapper(process,
            (err: Error) => { this.callbackError(err); },
            () => {
                try {
                    if (this.serverProc.outBuf.indexOf(this.version) > -1) {
                        const start = this.serverProc.outBuf.indexOf(this.version);
                        const end = this.serverProc.outBuf.indexOf("\n", start);
                        this.serverVersion = this.serverProc.outBuf.substring(start + this.version.length, end);
                        this.serverProc.sendQuit();
                    }
                } catch (e) {
                    this.callbackError(e);
                }
            },
            (code: number) => { /*this.handleProcessExit(code);*/ });
    }

    private handleProcessExit(code: number) {
        if (code !== 0) {
            this.callbackError(code);
        } else {
            this.callbackSuccess(this.serverVersion);
        }
    }
}

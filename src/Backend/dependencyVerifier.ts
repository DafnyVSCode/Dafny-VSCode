"use strict";
import * as cp from "child_process";
import { ProcessWrapper } from "../process/process";
import { Command } from "./environment";
import { Environment } from "./environment";

export class DependencyVerifier {

    private upgradeNecessary = "UPDATE_NECESSARY";
    private version = "VERSION:";

    private environment: Environment = new Environment();
    private serverProc: ProcessWrapper;
    private callbackSuccess: (serverVersion: string) => any;
    private callbackError: (error: any) => any;
    private upgradeCallback: () => any;
    private serverVersion: string;

    public verifyDafnyServer(callbackSuccess: (serverVersion: string) => any,
                             callbackError: (error: any) => any, upgradeCallback: () => any) {
        const spawnOptions = this.environment.getStandardSpawnOptions();
        const dafnyCommand: Command = this.environment.getStartDafnyCommand();
        this.callbackError = callbackError;
        this.callbackSuccess = callbackSuccess;
        this.upgradeCallback = upgradeCallback;

        this.verify(dafnyCommand, spawnOptions);
    }

    private verify(command: Command, spawnOptions: cp.SpawnOptions): void {
        try {
            this.serverProc = this.spawnNewProcess(command, spawnOptions);
            this.serverProc.sendRequestToDafnyServer("", "version");
        } catch(e) {
            this.callbackError(e);
        }
    }

    private spawnNewProcess(dafnyCommand: Command, options: cp.SpawnOptions): ProcessWrapper {
        const process = cp.spawn(dafnyCommand.command, dafnyCommand.args, options);
        return new ProcessWrapper(process,
            (err: Error) => { this.callbackError(err); },
            () => {
                console.log(this.serverProc.outBuf);
                if(this.serverProc.outBuf.indexOf(this.upgradeNecessary) > -1 || this.serverProc.outBuf.indexOf("FAILURE") > -1) {
                    this.upgradeCallback();
                    this.serverProc.sendQuit();
                } else if(this.serverProc.outBuf.indexOf(this.version) > -1) {
                    const start = this.serverProc.outBuf.indexOf(this.version);
                    const end = this.serverProc.outBuf.indexOf("\n", start);
                    this.serverVersion = this.serverProc.outBuf.substring(start + this.version.length, end);
                    console.log(this.serverVersion);
                    this.serverProc.clearBuffer();
                    this.serverProc.sendRequestToDafnyServer("", "versioncheck");
                } else {
                    this.serverProc.sendQuit();
                }
            },
            (code: number) => { this.handleProcessExit(code); });
    }

    private handleProcessExit(code: number) {
        if(code !== 0) {
            this.callbackError(code);
        } else {
            this.callbackSuccess(this.serverVersion);
        }
    }
}

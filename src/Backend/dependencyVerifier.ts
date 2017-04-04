"use strict";
import * as cp from "child_process";
import { ProcessWrapper } from "../Process/process";
import { Verification } from "./../Strings/regexRessources";
import { Command } from "./environment";
import { Environment } from "./environment";

export class DependencyVerifier {

    private environment: Environment = new Environment();
    private serverProc: ProcessWrapper;
    private callbackSuccess: (data: any) => any;
    private callbackError: (error: any) => any;
    private upgradeCallback: () => any;

    public verifyDafnyServer(callbackSuccess: (data: any) => any, callbackError: (error: any) => any, upgradeCallback: () => any) {
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
            this.serverProc.sendRequestToDafnyServer("", "versioncheck");
        } catch(e) {
            this.callbackError(e);
        }
    }

    private spawnNewProcess(dafnyCommand: Command, options: cp.SpawnOptions): ProcessWrapper {
        const process = cp.spawn(dafnyCommand.command, dafnyCommand.args, options);
        return new ProcessWrapper(process,
            (err: Error) => { this.callbackError(err); },
            () => {
                const upgradeNecessary = "UPDATE_NECESSARY";
                if(this.serverProc.outBuf.indexOf(upgradeNecessary) > -1) {
                    this.upgradeCallback();
                }
                console.log(this.serverProc.outBuf);
                this.serverProc.sendQuit();
            },
            (code: number) => { this.handleProcessExit(code); }, Verification.commandEndRegexDafnyServer);
    }

    private handleProcessExit(code: number) {
        if(code !== 0) {
            this.callbackError(code);
        } else {
            this.callbackSuccess(code);
        }
    }
}

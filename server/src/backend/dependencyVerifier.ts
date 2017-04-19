"use strict";

import * as cp from "child_process";
import {IConnection} from "vscode-languageserver";
import { ProcessWrapper } from "../process/process";
import {DafnySettings} from "./dafnySettings";
import { Command } from "./environment";
import { Environment } from "./environment";

export class DependencyVerifier {

    private upgradeNecessary = "UPDATE_NECESSARY";
    private version = "VERSION:";

    private serverProc: ProcessWrapper;
    private callbackSuccess: (serverVersion: string) => any;
    private callbackError: (error: any) => any;
    private upgradeCallback: () => any;
    private serverVersion: string;

    public verifyDafnyServer(rootPath: string, connection: IConnection, dafnySettings: DafnySettings,
                             callbackSuccess: (serverVersion: string) => any, callbackError: (error: any) => any,
                             upgradeCallback: () => any) {
        const environment: Environment = new Environment(rootPath, connection, dafnySettings);
        const spawnOptions = environment.getStandardSpawnOptions();
        const dafnyCommand: Command = environment.getStartDafnyCommand();
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
                try {
                    if(this.serverProc.outBuf.indexOf(this.upgradeNecessary) > -1 || this.serverProc.outBuf.indexOf("FAILURE") > -1) {
                        this.upgradeCallback();
                        this.serverProc.sendQuit();
                    } else if(this.serverProc.outBuf.indexOf(this.version) > -1) {
                        const start = this.serverProc.outBuf.indexOf(this.version);
                        const end = this.serverProc.outBuf.indexOf("\n", start);
                        this.serverVersion = this.serverProc.outBuf.substring(start + this.version.length, end);
                        this.serverProc.clearBuffer();
                        this.serverProc.sendRequestToDafnyServer("", "versioncheck");
                    } else {
                        this.serverProc.sendQuit();
                    }
                } catch(e) {
                    this.callbackError(e);
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

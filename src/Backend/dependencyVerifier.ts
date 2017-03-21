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

    public verifyDafnyServer(callbackSuccess: (data: any) => any, callbackError: (error: any) => any) {
        const spawnOptions = this.environment.GetStandardSpawnOptions();
        const dafnyCommand: Command = this.environment.GetStartDafnyCommand();
        this.callbackError = callbackError;
        this.callbackSuccess = callbackSuccess;

        this.verify(dafnyCommand, spawnOptions);
    }

    public verifyDafnyDef(callbackSuccess: (data: any) => any, callbackError: (error: any) => any) {
        const spawnOptions = this.environment.GetStandardSpawnOptions();
        const dafnyCommand: Command = this.environment.GetStartDafnyDefCommand();
        this.callbackError = callbackError;
        this.callbackSuccess = callbackSuccess;

        this.verify(dafnyCommand, spawnOptions);
    }

    private verify(command: Command, spawnOptions: cp.SpawnOptions): void {
        try {
            this.serverProc = this.spawnNewProcess(command, spawnOptions);
            this.serverProc.sendQuit();
        } catch(e) {
            this.callbackError(e);
        }
    }

    private spawnNewProcess(dafnyCommand: Command, options: cp.SpawnOptions): ProcessWrapper {
        const process = cp.spawn(dafnyCommand.command, dafnyCommand.args, options);
        return new ProcessWrapper(process,
            (err: Error) => { this.callbackError(err); },
            () => { },
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
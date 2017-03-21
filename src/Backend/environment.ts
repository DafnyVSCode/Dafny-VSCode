"use strict";

import * as cp from "child_process";
import * as os from "os";
import * as vscode from "vscode";
import {IncorrectPathExeption} from "../ErrorHandling/errors";
import {Config, EnvironmentConfig, ErrorMsg, WarningMsg } from "../Strings/stringRessources";

export class Command {
    public notFound: boolean = false;
    // tslint:disable-next-line:no-empty
    public constructor(public command: string = null, public args: string[]= null) {};
}

export class Environment {

    public usesMono: boolean;
    public hasCustomMonoPath: boolean;
    private config: vscode.WorkspaceConfiguration;
    private dafnyServerPath: string;
    private dafnyDefPath: string;
    constructor() {
        this.config = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);
        this.usesMono = this.config.get<boolean>(Config.UseMono) || os.platform() !== EnvironmentConfig.Win32;
        this.dafnyServerPath = this.config.get<string>(Config.DafnyServerPath);
        this.dafnyDefPath = this.config.get<string>(Config.DafnyDefPath);
        const monoPath: string = this.config.get<string>(Config.MonoPath);
        this.hasCustomMonoPath = monoPath !== "";
    }

    public testCommand(path: string): boolean {
        const process: cp.ChildProcess = cp.exec(path);
        const commandSuccessful: boolean = process.pid !== 0;
        if (commandSuccessful) {
            process.kill();
        }
        return commandSuccessful;
    }

    public getStartDafnyCommand(): Command {
        return this.getCommand(this.dafnyServerPath);
    }

    public getStartDafnyDefCommand(): Command {
       return this.getCommand(this.dafnyDefPath);
    }

    public getStandardSpawnOptions(): cp.SpawnOptions {
        const options: cp.SpawnOptions = {};
        if (vscode.workspace.rootPath) {
            options.cwd = vscode.workspace.rootPath;
        }
        options.stdio = [
            "pipe", // stdin
            "pipe", // stdout
            0, // ignore stderr
        ];
        return options;
    }

    public usesNonStandardMonoPath(): boolean {
        return this.usesMono && this.hasCustomMonoPath;
    }

    public getMonoPath(): string {
        let monoPath: string = this.config.get<string>(Config.MonoPath);
        const monoInSystemPath: boolean = this.testCommand(EnvironmentConfig.Mono);
        const monoAtConfigPath: boolean = this.hasCustomMonoPath && this.testCommand(monoPath);
        if (monoInSystemPath && !monoAtConfigPath) {
            monoPath = EnvironmentConfig.Mono;
        } else if (!monoInSystemPath && !monoAtConfigPath) {
            return "";
        }
        return monoPath;
    }
    private getCommand(commandName: string): Command {
        let baseCommand: string;
        let args: string[];
        let monoPath: string = this.config.get<string>(Config.MonoPath);
        if(commandName === undefined || commandName === "") {
            throw new IncorrectPathExeption();
        }
        if (!this.usesMono) {
            baseCommand = commandName;
            args = [];
            return new Command(baseCommand, args);
        } else {
            const monoInSystemPath: boolean = this.testCommand(EnvironmentConfig.Mono);
            const monoAtConfigPath: boolean = this.hasCustomMonoPath && this.testCommand(monoPath);
            if (monoInSystemPath && !monoAtConfigPath) {
                if (this.hasCustomMonoPath) {
                    vscode.window.showWarningMessage(WarningMsg.MonoPathWrong);
                }
                monoPath = EnvironmentConfig.Mono;
            } else if (!monoInSystemPath && !monoAtConfigPath) {
                vscode.window.showErrorMessage(ErrorMsg.NoMono);
                const command: Command = new Command();
                command.notFound = true;
                return command;
            }
            baseCommand = monoPath;
            args = [commandName];
            return new Command(baseCommand, args);
        }
    }
}

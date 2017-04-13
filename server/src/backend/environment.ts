"use strict";

import * as cp from "child_process";
import * as os from "os";
import * as vscode from "vscode-languageserver";
import {IConnection} from "vscode-languageserver";
import {IncorrectPathExeption} from "../errorHandling/errors";
import {Application, Config, EnvironmentConfig, ErrorMsg, WarningMsg, LanguageServerNotification } from "../strings/stringRessources";
import {DafnySettings} from "./dafnySettings";

export class Command {
    public notFound: boolean = false;
    // tslint:disable-next-line:no-empty
    public constructor(public command: string = null, public args: string[]= null) {};
}

export class Environment {

    constructor(private rootPath: string, private connection: IConnection, private dafnySettings: DafnySettings) {    }

    public testCommand(path: string): boolean {
        const process: cp.ChildProcess = cp.exec(path);
        const commandSuccessful: boolean = process.pid !== 0;
        if (commandSuccessful) {
            process.kill();
        }
        return commandSuccessful;
    }

    public getStartDafnyCommand(): Command {
        return this.getCommand(this.dafnySettings.basePath + "/" + Application.DafnyServer);
    }

    public getStandardSpawnOptions(): cp.SpawnOptions {
        const options: cp.SpawnOptions = {};
        if (this.rootPath) {
            options.cwd = this.rootPath;
        }
        options.stdio = [
            "pipe", // stdin
            "pipe", // stdout
            0, // ignore stderr
        ];
        return options;
    }

    public usesNonStandardMonoPath(): boolean {
        return this.dafnySettings.useMono && this.dafnySettings.monoPath !== "";
    }

    public getMonoPath(): string {
        let monoPath: string = this.dafnySettings.monoPath;
        const monoInSystemPath: boolean = this.testCommand(EnvironmentConfig.Mono);
        const monoAtConfigPath: boolean = this.dafnySettings.monoPath && this.testCommand(monoPath);
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
        let monoPath: string = this.dafnySettings.monoPath;
        if(commandName === undefined || commandName === "") {
            throw new IncorrectPathExeption();
        }
        if (!this.dafnySettings.useMono) {
            baseCommand = commandName;
            args = [];
            return new Command(baseCommand, args);
        } else {
            const monoInSystemPath: boolean = this.testCommand(EnvironmentConfig.Mono);
            const monoAtConfigPath: boolean = this.dafnySettings.monoPath && this.testCommand(monoPath);
            if (monoInSystemPath && !monoAtConfigPath) {
                if (this.dafnySettings.monoPath) {
                    this.connection.sendNotification(LanguageServerNotification.Warning, WarningMsg.MonoPathWrong);
                }
                monoPath = EnvironmentConfig.Mono;
            } else if (!monoInSystemPath && !monoAtConfigPath) {
                this.connection.sendNotification(LanguageServerNotification.Error, ErrorMsg.NoMono);
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

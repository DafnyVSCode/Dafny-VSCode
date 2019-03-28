"use strict";

import * as cp from "child_process";
import * as os from "os";
import { IncorrectPathExeption } from "../errors";
import {NotificationService} from "../notificationService";
import {Application, EnvironmentConfig, ErrorMsg, WarningMsg } from "../strings/stringRessources";
import { Command } from "./Command";
import {IDafnySettings} from "./dafnySettings";

export class Environment {

    public usesMono: boolean;

    constructor(private rootPath: string, private notificationService: NotificationService, private dafnySettings: IDafnySettings) {
        this.usesMono = this.dafnySettings.useMono || os.platform() !== EnvironmentConfig.Win32;
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
        return this.getCommand(this.getBasePath() + "/" + Application.DafnyServer);
    }

    public getDafnyExe(): Command {
        return this.getCommand(this.getBasePath() + "/" + Application.Dafny);
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
        const monoAtConfigPath: boolean = this.dafnySettings.monoPath !== "" && this.testCommand(monoPath);
        if (monoInSystemPath && !monoAtConfigPath) {
            monoPath = EnvironmentConfig.Mono;
        } else if (!monoInSystemPath && !monoAtConfigPath) {
            return "";
        }
        return monoPath;
    }

    /**
     * Determines the Dafny base path either from the configuration set in the Dafny settings,
     * or, if not available from there, from the environment variable DAFNY_PATH.
     * @return {String} A string containing the determined Dafny base path.
     */
    private getBasePath(): string {
        if (this.dafnySettings.basePath === "") {
            if (process.env.DAFNY_PATH === undefined || process.env.DAFNY_PATH === "") {
                return "";
            } else {
                return process.env.DAFNY_PATH;
            }
        }
        return this.dafnySettings.basePath;
    }

    private getCommand(commandName: string): Command {
        let baseCommand: string;
        let args: string[];
        let monoPath: string = this.dafnySettings.monoPath;
        if (commandName === undefined || commandName === "") {
            throw new IncorrectPathExeption();
        }
        if (!this.usesMono) {
            baseCommand = commandName;
            args = [];
            return new Command(baseCommand, args);
        } else {
            const monoInSystemPath: boolean = this.testCommand(EnvironmentConfig.Mono);
            const monoAtConfigPath: boolean = !!this.dafnySettings.monoPath && this.testCommand(monoPath);
            if (monoInSystemPath && !monoAtConfigPath) {
                if (this.dafnySettings.monoPath) {
                    this.notificationService.sendWarning(WarningMsg.MonoPathWrong);
                }
                monoPath = EnvironmentConfig.Mono;
            } else if (!monoInSystemPath && !monoAtConfigPath) {
                this.notificationService.sendError(ErrorMsg.NoMono);
                const command: Command = new Command("");
                command.notFound = true;
                return command;
            }
            baseCommand = monoPath;
            args = [commandName];
            return new Command(baseCommand, args);
        }
    }
}

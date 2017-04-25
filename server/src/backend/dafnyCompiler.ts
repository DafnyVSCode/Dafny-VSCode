"use strict";
import * as cp from "child_process";
import * as vscode from "vscode-languageserver";
import Uri from "vscode-uri";
import { NotificationService } from "../notificationService";
import { Context } from "./context";
import { DafnySettings } from "./dafnySettings";
import { Command } from "./environment";
import { Environment } from "./environment";

export class DafnyCompiler {

    constructor(private notificationService: NotificationService, private context: Context, private settings: DafnySettings) {
    }

    public compile(uri: Uri): Promise<CompilerResult> {

        return new Promise<CompilerResult>((resolve, reject) => {
            let executable = false;
            const environment: Environment = new Environment(this.context.rootPath, this.notificationService, this.settings);
            const dafnyCommand: Command = environment.getDafnyExe();

            const args = dafnyCommand.args;
            args.push("/compile:1");
            args.push("/nologo");
            args.push(uri.fsPath);
            console.log(dafnyCommand.command + " " + args);
            const process = cp.spawn(dafnyCommand.command, args, environment.getStandardSpawnOptions());
            process.on("exit", (code, signal) => {
                resolve({ error: false, executable });
            });
            process.stdout.on("error", (data: Buffer) => {
                reject({ error: true, message: data.toString() });
            });
            process.stdout.on("data", (data: Buffer) => {
                const str = data.toString();

                if (str.toLowerCase().indexOf("error") !== -1 && !(str.toLowerCase().indexOf("0 errors") !== -1)) {
                    reject({ error: true, message: str });
                }
                if (str.toLowerCase().indexOf(".exe") !== -1) {
                    executable = true;
                }

            });
        });
    };
}

export class CompilerResult {
    public error: boolean;
    public message?: string;
    public executable?: boolean;
}

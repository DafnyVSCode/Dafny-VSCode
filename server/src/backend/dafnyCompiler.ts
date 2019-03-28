"use strict";
import * as cp from "child_process";
import Uri from "vscode-uri";
import { NotificationService } from "../notificationService";
import { Command } from "./Command";
import { Context } from "./context";
import { IDafnySettings } from "./dafnySettings";
import { Environment } from "./environment";
import { ICompilerResult } from "./ICompilerResult";

export class DafnyCompiler {

    constructor(private notificationService: NotificationService, private context: Context, private settings: IDafnySettings) {
    }

    public compile(uri: Uri): Promise<ICompilerResult> {

        return new Promise<ICompilerResult>((resolve, reject) => {
            let executable = false;
            const environment: Environment = new Environment(this.context.rootPath, this.notificationService, this.settings);
            const dafnyCommand: Command = environment.getDafnyExe();

            const args = dafnyCommand.args;
            args.push("/compile:1");
            args.push("/nologo");
            args.push(uri.fsPath);
            console.log(dafnyCommand.command + " " + args);
            const process = cp.spawn(dafnyCommand.command, args, environment.getStandardSpawnOptions());
            process.on("exit", () => {
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
    }
}

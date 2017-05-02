"use strict";

import * as os from "os";
import * as vscode from "vscode";
import { Config, EnvironmentConfig } from "./stringRessources";

export class DafnyRunner {

    private config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);

    public run(filename: string) {
        const terminal = vscode.window.createTerminal("Run " + filename);
        const command = this.getCommand(filename);
        console.log(command);
        terminal.show();
        terminal.sendText(command);
    }

    private getCommand(filename: string): string {
        const executable = filename.replace(".dfy", ".exe");
        const monoPath: string = this.config.get<string>(Config.MonoPath);
        const useMono: boolean = this.config.get<boolean>(Config.UseMono) || os.platform() !== EnvironmentConfig.Win32;
        if (!useMono) {
            return "& " + '"' + executable + '"';
        } else {
            if (monoPath) {
                return monoPath + " " + '"' + executable + '"';
            }
            return "mono " + executable;
        }
    }
}

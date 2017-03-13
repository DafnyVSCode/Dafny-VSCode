"use strict";

import * as os from "os";
import * as vscode from "vscode";
import {DafnyServer} from "../Backend/dafnyServer";
import {Config, EnvironmentConfig, ErrorMsg, InfoMsg } from "../Strings/stringRessources";

export class DafnyInstaller {

    constructor(private extensionPath: string) {
    }

    public install(): void {

        const terminal = vscode.window.createTerminal("Install Dafny");
        terminal.show(true);

        if(os.platform() === EnvironmentConfig.Win32) {
            vscode.window.onDidCloseTerminal((e: vscode.Terminal) => {
                if(e.name === terminal.name) {
                    const appdata = process.env.APPDATA;
                    const installPath = appdata + "\\Dafny\\Windows\\dafny\\DafnyServer.exe";
                    this.finishInstallation(installPath);
                }
            });

            const downloadScript = this.extensionPath + "\\scripts\\windows\\download.ps1";
            terminal.sendText(downloadScript);
        }

    }

     public uninstall(): void {

        const terminal = vscode.window.createTerminal("Uninstall Dafny");
        terminal.show(true);

        if(os.platform() === EnvironmentConfig.Win32) {
            const appdata = process.env.APPDATA;
            const installPath = appdata + "\\Dafny";
            terminal.sendText("Remove-Item -Recurse -Force " + installPath);
        }
    }

    private finishInstallation(dafnyServerPath: string): void {
        const config = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);

        config.update(Config.DafnyServerPath, dafnyServerPath).then(() => {
            this.verifyInstallation();
        });
    }

    private verifyInstallation() {

        const dafnyServer = new DafnyServer(null, null);
        if(dafnyServer.verify()) {
            vscode.window.showInformationMessage(InfoMsg.DafnyInstallationSucceeded);
        } else {
            vscode.window.showErrorMessage(ErrorMsg.DafnyInstallationFailed);
        }
    }
}

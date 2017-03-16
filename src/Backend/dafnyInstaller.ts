"use strict";

import * as os from "os";
import * as vscode from "vscode";
import {DafnyServer} from "../Backend/dafnyServer";
import {DafnyUnsupportedPlatform} from "../ErrorHandling/errors";
import {Config, EnvironmentConfig, ErrorMsg, InfoMsg } from "../Strings/stringRessources";

export class DafnyInstaller {

    constructor(private extensionPath: string, private successfulInstalled?: () => any) {
    }

    public install(): void {

        const terminal = vscode.window.createTerminal("Install Dafny");
        terminal.show(true);
        let installPath = "";
        let downloadScript = "";

        if(os.platform() === EnvironmentConfig.Win32) {
            const appdata = process.env.APPDATA;
            installPath = appdata + "\\Dafny\\Windows\\dafny\\DafnyServer.exe";
            downloadScript = this.extensionPath + "\\scripts\\windows\\download.ps1";

        } else if(os.platform() === EnvironmentConfig.OSX) {
            const home = process.env.HOME;
            installPath = home + "/.Dafny/dafny/DafnyServer.exe";
            downloadScript = this.extensionPath + "/scripts/osx/download.sh";
            terminal.sendText("chmod +x " + downloadScript);

        } else if(os.platform() === EnvironmentConfig.Ubuntu) {
            const home = process.env.HOME;
            installPath = home + "/.Dafny/dafny/DafnyServer.exe";
            downloadScript = this.extensionPath + "/scripts/ubuntu/download.sh";
            terminal.sendText("chmod +x " + downloadScript);

        } else {
            throw new DafnyUnsupportedPlatform("Unsupported platform: " + os.platform());
        }

        vscode.window.onDidCloseTerminal((e: vscode.Terminal) => {
            if(e.name === terminal.name) {
                this.finishInstallation(installPath);
            }
        });
        terminal.sendText(downloadScript);
    }

     public uninstall(): void {
        const config = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);
        const terminal = vscode.window.createTerminal("Uninstall Dafny");
        terminal.show(true);

        let uninstallScript = "";
        if(os.platform() === EnvironmentConfig.Win32) {
            uninstallScript = this.extensionPath + "\\scripts\\windows\\uninstall.ps1";
        } else if(os.platform() === EnvironmentConfig.OSX) {
            uninstallScript = this.extensionPath + "/scripts/osx/uninstall.sh";
            terminal.sendText("chmod +x " + uninstallScript);
        } else if(os.platform() === EnvironmentConfig.Ubuntu) {
            uninstallScript = this.extensionPath + "/scripts/ubuntu/uninstall.sh";
            terminal.sendText("chmod +x " + uninstallScript);
        } else {
            throw new DafnyUnsupportedPlatform("Unsupported platform: " + os.platform());
        }

        vscode.window.onDidCloseTerminal((e: vscode.Terminal) => {
            if(e.name === terminal.name) {
                config.update(Config.DafnyServerPath, undefined, true);
                vscode.window.showInformationMessage(InfoMsg.DafnyUninstallationSucceeded);
            }
        });

        terminal.sendText(uninstallScript);
    }

    private finishInstallation(dafnyServerPath: string): void {
        const config = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);

        config.update(Config.DafnyServerPath, dafnyServerPath, true).then(() => {
            this.verifyInstallation();
        });
    }

    private verifyInstallation() {

        const dafnyServer = new DafnyServer(null, null);
        if(dafnyServer.verify()) {
            vscode.window.showInformationMessage(InfoMsg.DafnyInstallationSucceeded);
            if(this.successfulInstalled) {
                this.successfulInstalled();
            }
        } else {
            vscode.window.showErrorMessage(ErrorMsg.DafnyInstallationFailed);
        }
    }
}

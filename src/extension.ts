"use strict";

import * as vscode from "vscode";
import {DafnyInstaller} from "./Backend/dafnyInstaller";
import {DafnyDiagnosticsProvider} from "./Frontend/dafnyProvider";
import {Commands, Config, EnvironmentConfig, ErrorMsg} from "./Strings/stringRessources";

export function activate(context: vscode.ExtensionContext): void {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);
    const dafnyServerPath: string = config.get<string>(Config.DafnyServerPath);
    let verifier: DafnyDiagnosticsProvider = null;

    init();

    const restartServerCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.RestartServer, () => {
        if (verifier) {
            return verifier.resetServer();
        }
        return false;
    });
    context.subscriptions.push(restartServerCommand);

    const installDafnyCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.InstallDafny, () => {
        const installer: DafnyInstaller = new DafnyInstaller(context.extensionPath, () => {
            init();
        });
        installer.install();
    });
    context.subscriptions.push(installDafnyCommand);

    const uninstallDafnyCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.UninstallDafny, () => {
        const installer: DafnyInstaller = new DafnyInstaller(context.extensionPath);
        if (verifier) {
            verifier.stop();
        }
        installer.uninstall();
    });
    context.subscriptions.push(uninstallDafnyCommand);

    function init() {
        if (!dafnyServerPath) {
            vscode.window.showErrorMessage(ErrorMsg.ServerPathNotSet);
        } else {
            verifier = new DafnyDiagnosticsProvider();
            verifier.activate(context.subscriptions);
            context.subscriptions.push(verifier);
        }

    }

}

// this method is called when your extension is deactivated
export function deactivate(): void {
    // todo maybe deinstall dafny server
}

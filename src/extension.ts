"use strict";

import * as vscode from "vscode";
import {DafnyInstaller} from "./Backend/dafnyInstaller";
import {DafnyDiagnosticsProvider} from "./Frontend/dafnyProvider";
import {Commands, Config, EnvironmentConfig, ErrorMsg} from "./Strings/stringRessources";

export function activate(context: vscode.ExtensionContext): void {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);
    const dafnyServerPath: string = config.get<string>(Config.DafnyServerPath);
    let verifier: DafnyDiagnosticsProvider = null;

    if (!dafnyServerPath) {
        vscode.window.showErrorMessage(ErrorMsg.ServerPathNotSet);
    } else {
        verifier = new DafnyDiagnosticsProvider();
        verifier.activate(context.subscriptions);
        context.subscriptions.push(verifier);
    }

    const restartServerCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.RestartServer, () => {
        if (verifier) {
            return verifier.resetServer();
        }
        return false;
    });
    context.subscriptions.push(restartServerCommand);

    const installDafnyCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.InstallDafny, () => {
        const installer: DafnyInstaller = new DafnyInstaller(context.extensionPath);
        installer.install();
    });
    context.subscriptions.push(installDafnyCommand);

}

// this method is called when your extension is deactivated
export function deactivate(): void {
    // todo maybe deinstall dafny server
}

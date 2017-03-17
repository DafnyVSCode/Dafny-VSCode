"use strict";

import * as vscode from "vscode";
import {DafnyInstaller} from "./Backend/dafnyInstaller";
import { GO_MODE, GoDefinitionProvider } from "./Backend/definitionProvider";
import {DafnyDiagnosticsProvider} from "./Frontend/dafnyProvider";
import {Commands, Config, EnvironmentConfig, ErrorMsg} from "./Strings/stringRessources";
export function activate(context: vscode.ExtensionContext): void {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);
    const dafnyServerPath: string = config.get<string>(Config.DafnyServerPath);
    let verifier: DafnyDiagnosticsProvider = null;

    startCheck();

    const restartServerCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.RestartServer, () => {
        if (verifier) {
            return verifier.resetServer();
        }
        return false;
    });
    context.subscriptions.push(restartServerCommand);
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            GO_MODE, new GoDefinitionProvider()));
    const installDafnyCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.InstallDafny, () => {
        install();
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
        try {
            if (!verifier) {
                verifier = new DafnyDiagnosticsProvider();
                verifier.resetServer();
                verifier.activate(context.subscriptions);
                context.subscriptions.push(verifier);
            } else {
                verifier.resetServer();
            }
        }catch(e) {

            if(verifier) {
                verifier.dispose();
            }
            askToInstall();
        }
    }

    function startCheck() {
        if (dafnyServerPath) {
            init();
        } else {
            verifier.dispose();
            vscode.window.showErrorMessage(ErrorMsg.ServerPathNotSet);
            askToInstall();
        }
    }

    function askToInstall() {
        vscode.window.showInformationMessage("Would you like to install dafny?", "Yes", "No").then((value: string) => {
            if("Yes" === value) {
                install();
            }
        });
    }

    function install() {
        const installer: DafnyInstaller = new DafnyInstaller(context.extensionPath, () => {
            init();
        });
        installer.install();
    }

}

// this method is called when your extension is deactivated
export function deactivate(): void {
    // todo maybe deinstall dafny server
}

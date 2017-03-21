"use strict";

import * as vscode from "vscode";
import {DafnyInstaller} from "./Backend/dafnyInstaller";
import {DependencyVerifier} from "./Backend/dependencyVerifier";
import { GO_MODE, GoDefinitionProvider } from "./Backend/features/definitionProvider";
import { DafnyImplementationsCodeLensProvider } from "./Backend/Features/implementationsCodeLensProvider";
import {DafnyDiagnosticsProvider} from "./Frontend/dafnyProvider";
import { ErrorMsg, InfoMsg } from "./Strings/stringRessources";
import {Commands} from "./Strings/stringRessources";
export function activate(context: vscode.ExtensionContext): void {
    let provider: DafnyDiagnosticsProvider = null;
    const dependencyVerifier: DependencyVerifier = new DependencyVerifier();
    dependencyVerifier.verifyDafnyServer(() => {
        dependencyVerifier.verifyDafnyDef(() => {
            init();
        }, () => {
            vscode.window.showErrorMessage(ErrorMsg.DafnyDefMissing);
            askToInstall();
        });
    }, () => {
        vscode.window.showErrorMessage(ErrorMsg.DafnyCantBeStarted);
        askToInstall();
    });

    const restartServerCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.RestartServer, () => {
        if (provider) {
            return provider.resetServer();
        }
        return false;
    });
    context.subscriptions.push(restartServerCommand);
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            GO_MODE, new GoDefinitionProvider()));
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(GO_MODE, new DafnyImplementationsCodeLensProvider()));

    const installDafnyCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.InstallDafny, () => {
        install();
    });
    context.subscriptions.push(installDafnyCommand);

    const uninstallDafnyCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.UninstallDafny, () => {
        const installer: DafnyInstaller = new DafnyInstaller(context.extensionPath);
        if (provider) {
            provider.stop();
        }
        installer.uninstall();
    });
    context.subscriptions.push(uninstallDafnyCommand);

    function init() {
        try {
            if(!provider) {
                provider = new DafnyDiagnosticsProvider();
                provider.activate(context.subscriptions);
                context.subscriptions.push(provider);
                provider.resetServer();
            } else {
                provider.init();
                provider.resetServer();
            }
        } catch(e) {
            vscode.window.showErrorMessage("Exception occured: " + e);
        }
    }

    function askToInstall() {
        vscode.window.showInformationMessage("Would you like to install Dafny?", "Yes", "No").then((value: string) => {
            if("Yes" === value) {
                install();
            }
        });
    }

    function install() {
        const installer: DafnyInstaller = new DafnyInstaller(context.extensionPath, () => {

            const verifier: DependencyVerifier = new DependencyVerifier();
            verifier.verifyDafnyServer(() => {
                verifier.verifyDafnyDef(() => {
                    vscode.window.showInformationMessage(InfoMsg.DafnyInstallationSucceeded);
                    init();
                }, () => {
                    vscode.window.showErrorMessage(ErrorMsg.DafnyInstallationFailed);
                });
            }, () => {
                vscode.window.showErrorMessage(ErrorMsg.DafnyInstallationFailed);
            });
        });
        if (provider) {
            provider.stop();
        }
        installer.uninstall();
        installer.install();
    }

}

export function deactivate(): void {
    // todo maybe deinstall dafny server
}

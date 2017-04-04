"use strict";

import * as vscode from "vscode";
import {DafnyInstaller} from "./Backend/dafnyInstaller";
import {DependencyVerifier} from "./Backend/dependencyVerifier";

import {DafnyDiagnosticsProvider} from "./Frontend/dafnyProvider";
import { ErrorMsg, InfoMsg } from "./Strings/stringRessources";
import {Commands} from "./Strings/stringRessources";

export function activate(context: vscode.ExtensionContext): void {

    let provider: DafnyDiagnosticsProvider = null;
    const dependencyVerifier: DependencyVerifier = new DependencyVerifier();
    dependencyVerifier.verifyDafnyServer(() => {
        /*dependencyVerifier.verifyDafnyDef(() => {
            init();
        }, () => {
            vscode.window.showErrorMessage(ErrorMsg.DafnyDefMissing);
            askToInstall();
        });*/
        init();
    }, () => {
        vscode.window.showErrorMessage(ErrorMsg.DafnyCantBeStarted);
        askToInstall();
    }, () => {
        askToInstall(InfoMsg.DafnyUpdateAvailable);
    });

    const restartServerCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.RestartServer, () => {
        if (provider) {
            return provider.resetServer();
        }
        return false;
    });
    context.subscriptions.push(restartServerCommand);

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
                provider = new DafnyDiagnosticsProvider(context);
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

    function askToInstall(text: string = "Would you like to install Dafny?") {
        vscode.window.showInformationMessage(text, "Yes", "No").then((value: string) => {
            if("Yes" === value) {
                install();
            }
        });
    }

    function install() {
        const installer: DafnyInstaller = new DafnyInstaller(context.extensionPath, () => {

            const verifier: DependencyVerifier = new DependencyVerifier();
            verifier.verifyDafnyServer(() => {
                /*verifier.verifyDafnyDef(() => {
                    vscode.window.showInformationMessage(InfoMsg.DafnyInstallationSucceeded);
                    init();
                }, () => {
                    vscode.window.showErrorMessage(ErrorMsg.DafnyInstallationFailed);
                });*/
                init();
            }, () => {
                vscode.window.showErrorMessage(ErrorMsg.DafnyInstallationFailed);
            }, () => {
                console.log("Should not happen, that the version which has been installed is already obsolete");
            });
        });
        if (provider) {
            provider.stop();
        }
        installer.uninstall(false);
        installer.install();
    }

}

export function deactivate(): void {
    // todo maybe deinstall dafny server
}

"use strict";

import { platform } from "os";
import * as vscode from "vscode";
import { Context } from "./context";
import { DafnyClientProvider } from "./dafnyProvider";
import { DafnyRunner } from "./dafnyRunner";
import Capabilities from "./helpers/capabilities";
import DafnyLanguageClient from "./server/dafnyLanguageClient";
import { EnvironmentConfig, ErrorMsg, LanguageServerNotification, WarningMsg } from "./stringRessources";
import Commands from "./ui/commands";
import Notifications from "./ui/notifications";

let provider: DafnyClientProvider;
const runner: DafnyRunner = new DafnyRunner();

export function activate(extensionContext: vscode.ExtensionContext) {

    // @todo This should be a gracefull feature reduction
    if (vscode.workspace.rootPath === undefined) {
        vscode.window.showWarningMessage(WarningMsg.NoWorkspace);
    }

    if (!Capabilities.hasSupportedMonoVersion()) {
        // Promt the user to install Mono and stop extension execution.
        vscode.window.showErrorMessage(ErrorMsg.NoSupportedMono, ErrorMsg.ConfigureMonoExecutable, ErrorMsg.GetMono)
        .then((selection) => {
            if (selection === ErrorMsg.GetMono) {
                vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(ErrorMsg.GetMonoUri));
                let restartMessage;
                if (platform() === EnvironmentConfig.OSX) {
                    // Mono adds a new folder to PATH; so give the easiest advice... ;)
                    restartMessage = ErrorMsg.RestartMacAfterMonoInstall;
                } else {
                    restartMessage = ErrorMsg.RestartCodeAfterMonoInstall;
                }
                vscode.window.showWarningMessage(restartMessage);
            }

            if (selection === ErrorMsg.ConfigureMonoExecutable) {
                vscode.commands.executeCommand("workbench.action.configureLanguageBasedSettings");
            }
        });
        return;
    }

    const languageServer = new DafnyLanguageClient(extensionContext);

    languageServer.onReady().then(() => {
        provider = new DafnyClientProvider(extensionContext, languageServer);

        const commands = new Commands(extensionContext, languageServer, provider, runner);
        commands.registerCommands();

        const notifications = new Notifications(extensionContext, languageServer, provider, commands);
        notifications.registerNotifications();

        languageServer.onNotification(LanguageServerNotification.Ready, () => {
            if (Context.unitTest) {
                Context.unitTest.backendStarted();
            }
            provider.activate(extensionContext.subscriptions);
        });
    });

    const languageServerDisposable = languageServer.start();
    extensionContext.subscriptions.push(languageServerDisposable);
}

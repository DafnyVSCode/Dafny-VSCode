"use strict";

import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient";
import { DafnyClientProvider } from "./dafnyProvider";
import { DafnyRunner } from "./dafnyRunner";
import { WarningMsg, LanguageServerNotification } from "./stringRessources";
import DafnyLanguageClient from './server/dafnyLanguageClient';
import Notifications from "./ui/notifications";
import Commands from "./ui/commands";
import { Context } from "./context";

let languageServer: LanguageClient = null;
let provider: DafnyClientProvider;
const runner: DafnyRunner = new DafnyRunner();

export function activate(extensionContext: vscode.ExtensionContext) {

    languageServer = new DafnyLanguageClient(extensionContext);

    // @todo This should be a gracefull feature reduction
    if (vscode.workspace.rootPath === undefined) {
        vscode.window.showWarningMessage(WarningMsg.NoWorkspace);
    }
    
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

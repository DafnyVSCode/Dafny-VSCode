import * as vscode from "vscode";
import { DafnyClientProvider } from "../dafnyProvider";
import Commands from "./commands";
import { LanguageServerNotification, Answer } from "../stringRessources";
import DafnyLanguageClient from "../server/dafnyLanguageClient";

/**
 * VSCode UI Notifications
 * Subscribes to notification events from the DafnyLanguageClient.
 */
export default class Notifications {
    extensionContext: vscode.ExtensionContext;
    languageServer: DafnyLanguageClient;
    provider: DafnyClientProvider;
    commands: Commands;

    notifications = [
        {method: LanguageServerNotification.Error, handler: vscode.window.showErrorMessage},
        {method: LanguageServerNotification.Warning, handler: vscode.window.showWarningMessage},
        {method: LanguageServerNotification.Info, handler: vscode.window.showInformationMessage},
        {method: LanguageServerNotification.DafnyMissing, handler: (message: string) => this.askToInstall(message)}
    ];

    constructor(extensionContext: vscode.ExtensionContext, languageServer: DafnyLanguageClient, provider: DafnyClientProvider, commands: Commands){
        this.extensionContext = extensionContext;
        this.languageServer = languageServer;
        this.provider = provider;
        this.commands = commands;
    }

    registerNotifications() {
        for (const notification of this.notifications) {
            this.languageServer.onNotification(notification.method, notification.handler);
        }
    }

    askToInstall(text: string) {
        vscode.window.showInformationMessage(text, Answer.Yes, Answer.No).then((value: string) => {
            if (Answer.Yes === value) {
                this.commands.installDafny();
            }
        });
    }
}
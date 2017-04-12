"use strict";

import * as path from "path";
import * as vscode from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient";
import { DafnyInstaller } from "./dafnyInstaller";
import { DafnyClientProvider } from "./dafnyProvider";
import { Answer, Commands, LanguageServerNotification, LanguageServerRequest } from "./stringRessources";

let languageServer: LanguageClient = null;
let provider: DafnyClientProvider;

export function activate(context: vscode.ExtensionContext) {
    const serverModule = context.asAbsolutePath(path.join("server", "server.js"));
    const debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };

    const serverOptions: ServerOptions = {
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
        run: { module: serverModule, transport: TransportKind.ipc }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: ["dafny"],
        synchronize: {
            configurationSection: "dafny",
        }
    }

    languageServer = new LanguageClient("dafny-vscode", "Dafny Language Server", serverOptions, clientOptions);
    languageServer.onReady().then(() => {

        provider = new DafnyClientProvider(context, languageServer);

        languageServer.onNotification(LanguageServerNotification.Error, (message: string) => {
            vscode.window.showErrorMessage(message);
        });
        languageServer.onNotification(LanguageServerNotification.Info, (message: string) => {
            vscode.window.showInformationMessage(message);
        });

        languageServer.onNotification(LanguageServerNotification.DafnyMissing, (message: string) => {
            askToInstall(message);
        });

        

        provider.activate(context.subscriptions);
    });

    const disposable = languageServer.start();
    context.subscriptions.push(disposable);

    const restartServerCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.RestartServer, () => {
        languageServer.sendRequest(LanguageServerRequest.Reset).then(() => {
            return true;
        }, () => {
            vscode.window.showErrorMessage("Can't restart dafny");
        });
    });
    context.subscriptions.push(restartServerCommand);

    const installDafnyCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.InstallDafny, () => {
        install();
    });
    context.subscriptions.push(installDafnyCommand);

    const uninstallDafnyCommand: vscode.Disposable = vscode.commands.registerCommand(Commands.UninstallDafny, () => {
        const installer: DafnyInstaller = new DafnyInstaller(context.extensionPath);

        languageServer.sendRequest(LanguageServerRequest.Stop).then(() => {
            installer.uninstall();
        }, () => {
            vscode.window.showErrorMessage("Can't uninstall dafny");
        });

    });
    context.subscriptions.push(uninstallDafnyCommand);

    function askToInstall(text: string) {
        vscode.window.showInformationMessage(text, Answer.Yes, Answer.No).then((value: string) => {
            if (Answer.Yes === value) {
                install();
            }
        });
    }

    function install(): Thenable<void> {

        const promise = new Promise<void>(function (resolve, reject) {

            const installer: DafnyInstaller = new DafnyInstaller(context.extensionPath, () => {
                resolve();
            }, () => {
                installer.install();
            });

            languageServer.sendRequest(LanguageServerRequest.Stop).then(() => {
                installer.uninstall(false);
            }, () => {
                vscode.window.showErrorMessage("Can't stop dafny");
                reject();
            });
        });
        return promise;
    }
}

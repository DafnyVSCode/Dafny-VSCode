"use strict";
import { Strings } from "./stringRessources";
import * as vscode from "vscode";
import {DafnyDiagnosticsProvider} from "./dafnyProvider";

export function activate(context: vscode.ExtensionContext): void {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("dafny");
    const dafnyServerPath: string = config.get<string>("dafnyServerPath");
    let verifier: DafnyDiagnosticsProvider = null;

    if (!dafnyServerPath) {
        vscode.window.showErrorMessage(Strings.ServerPathNotSet);
    } else {
        verifier = new DafnyDiagnosticsProvider();
        verifier.activate(context.subscriptions);
        context.subscriptions.push(verifier);
    }

    const restartServerCommand: vscode.Disposable = vscode.commands.registerCommand("dafny.restartDafnyServer", () => {
        if (verifier) {
            return verifier.resetServer();
        }
        return false;
    });

    context.subscriptions.push(restartServerCommand);
}

// this method is called when your extension is deactivated
export function deactivate(): void {
    // todo maybe deinstall dafny server
}


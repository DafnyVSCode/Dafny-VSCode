'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {DafnyDiagnosticsProvider} from './dafnyProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let config = vscode.workspace.getConfiguration("dafny");
    let dafnyServerPath = config.get<string>("dafnyServerPath");
    var verifier: DafnyDiagnosticsProvider = null;

    if (!dafnyServerPath) {
        vscode.window.showErrorMessage("Dafny Verifier error: dafnyServerPath not set");
    }
    else {
        verifier = new DafnyDiagnosticsProvider();
        verifier.activate(context.subscriptions);
        context.subscriptions.push(verifier);
    }

    let restartServerCommand = vscode.commands.registerCommand("dafny.restartDafnyServer", () => {
        if (verifier) {
            return verifier.resetServer();
        }
        return false;
    });

    context.subscriptions.push(restartServerCommand);  
}

// this method is called when your extension is deactivated
export function deactivate() {
    
}


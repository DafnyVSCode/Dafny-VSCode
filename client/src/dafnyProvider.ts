"use strict";
import * as vscode from "vscode";
import {Config,  EnvironmentConfig, LanguageServerNotification } from "./stringRessources";
import {Statusbar} from "./dafnyStatusbar";
import { LanguageClient } from "vscode-languageclient";
import {TextDocumentItem} from "vscode-languageserver-types";

export class DafnyClientProvider {
    private diagCol: vscode.DiagnosticCollection = null;

    private docChangeTimers: { [docPathName: string]: NodeJS.Timer } = {};
    private docChangeVerify: boolean = false;
    private docChangeDelay: number = 0;
    private subscriptions: vscode.Disposable[];
    private dafnyStatusbar: Statusbar;

    constructor(public vsCodeContext: vscode.ExtensionContext, public languageServer: LanguageClient) {
        this.diagCol = vscode.languages.createDiagnosticCollection(EnvironmentConfig.Dafny);

        const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);
        this.docChangeVerify = config.get<boolean>(Config.AutomaticVerification);
        this.docChangeDelay = config.get<number>(Config.AutomaticVerificationDelay);

        this.dafnyStatusbar = new Statusbar(this.languageServer);
    }

    public activate(subs: vscode.Disposable[]): void {
        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
            if (editor) {
                this.dafnyStatusbar.update();
            }
        }, this);
        this.subscriptions = subs;
        vscode.workspace.onDidOpenTextDocument(this.doVerify, this);
        vscode.workspace.onDidCloseTextDocument((textDocument) => {
            this.diagCol.delete(textDocument.uri);
        }, this);

        if(this.docChangeVerify) {
            vscode.workspace.onDidChangeTextDocument(this.docChanged, this);
        }
        vscode.workspace.onDidSaveTextDocument(this.doVerify, this);
        vscode.workspace.textDocuments.forEach(this.doVerify, this);

     }

    public dispose(): void {
        this.dafnyStatusbar.hide();
        this.diagCol.clear();
        this.diagCol.dispose();
        if(this.subscriptions && this.subscriptions.length > 0) {
            for(let i: number = 0; i < this.subscriptions.length; i++) {
                this.subscriptions[i].dispose();
            }
        }
    }
    private doVerify(textDocument: vscode.TextDocument): void {
        if (textDocument !== null && textDocument.languageId === EnvironmentConfig.Dafny) {
            const tditem = JSON.stringify(TextDocumentItem.create(textDocument.uri.toString(), textDocument.languageId, textDocument.version, textDocument.getText()));
            console.log("sending to language server " + tditem);
            this.languageServer.sendNotification(LanguageServerNotification.Verify, tditem);
        }
    }

    private docChanged(change: vscode.TextDocumentChangeEvent): void {
        if (change !== null && change.document !== null && change.document.languageId === EnvironmentConfig.Dafny) {

            const docName: string = change.document.fileName;

            if (this.docChangeTimers[docName]) {
                clearTimeout(this.docChangeTimers[docName]);
            }

            this.docChangeTimers[docName] = setTimeout(() => {
                this.doVerify(change.document);
            }, this.docChangeDelay);
        }
    }
}
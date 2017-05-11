"use strict";
import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient";
import { TextDocumentItem } from "vscode-languageserver-types";
import { Context } from "./context";
import { CounterModelProvider } from "./counterModelProvider";
import { Statusbar } from "./dafnyStatusbar";
import { Config, EnvironmentConfig, LanguageServerNotification } from "./stringRessources";
import { VerificationResult } from "./verificationResult";

export class DafnyClientProvider {
    public dafnyStatusbar: Statusbar;
    private docChangeTimers: { [docPathName: string]: NodeJS.Timer } = {};
    private docChangeVerify: boolean = false;
    private docChangeDelay: number = 0;
    private subscriptions: vscode.Disposable[];

    private counterModelProvider: CounterModelProvider;
    private context: Context;

    constructor(public vsCodeContext: vscode.ExtensionContext, public languageServer: LanguageClient) {
        const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);
        this.docChangeVerify = config.get<boolean>(Config.AutomaticVerification);
        this.docChangeDelay = config.get<number>(Config.AutomaticVerificationDelay);
        this.context = new Context();
        this.dafnyStatusbar = new Statusbar(this.languageServer, this.context);
        this.counterModelProvider = new CounterModelProvider(this.context);

        languageServer.onNotification(LanguageServerNotification.VerificationResult,
            (docPathName: string, json: string) => {
                this.context.localQueue.remove(docPathName);
                console.log("notificiation: " + docPathName);
                const verificationResult: VerificationResult = JSON.parse(json);
                this.context.verificationResults[docPathName] = verificationResult;
                console.log(verificationResult);
                this.dafnyStatusbar.update();
                this.counterModelProvider.update();
            });
    }

    public activate(subs: vscode.Disposable[]): void {
        console.log("length: " + vscode.workspace.textDocuments.length);
        vscode.workspace.textDocuments.forEach((e) => {
            console.log("blub: " + e.fileName);
            this.doVerify(e);
        }, this);

        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
            if (editor) {
                this.dafnyStatusbar.update();
                this.counterModelProvider.update();
            }
        }, this);
        this.subscriptions = subs;
        vscode.workspace.onDidOpenTextDocument(this.doVerify, this);

        if (this.docChangeVerify) {
            vscode.workspace.onDidChangeTextDocument(this.docChanged, this);
        }
        vscode.workspace.onDidSaveTextDocument(this.doVerify, this);

    }

    public dispose(): void {
        this.dafnyStatusbar.hide();
        if (this.subscriptions && this.subscriptions.length > 0) {
            for (let i: number = 0; i < this.subscriptions.length; i++) {
                this.subscriptions[i].dispose();
            }
        }
    }
    private doVerify(textDocument: vscode.TextDocument): void {
        if (textDocument !== null && textDocument.languageId === EnvironmentConfig.Dafny) {
            this.context.localQueue.add(textDocument.uri.toString());
            const tditem = JSON.stringify(TextDocumentItem.create(textDocument.uri.toString(),
                textDocument.languageId, textDocument.version, textDocument.getText()));
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

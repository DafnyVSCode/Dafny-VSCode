"use strict";

import * as vscode from "vscode";
import {Context} from "./Context";
import {DafnyServer} from "./dafnyServer";
import {Statusbar} from "./dafnyStatusbar";
import { EnvironmentConfig } from "./stringRessources";

class DocChangeTimerRecord {
    public active: boolean = false;
    constructor(
        public doc: vscode.TextDocument,
        public lastChange: number // epoch ms (use Date.now())
    ) {}
}

export class DafnyDiagnosticsProvider {
    private diagCol: vscode.DiagnosticCollection = null;

    // onTextChanged events are sent on each character change,
    // but we only want to send a verification request after a bunch of changes are done
    private docChangeTimers: { [docPathName: string]: DocChangeTimerRecord } = {};
    private docChangeVerify: boolean = false; // dafny.automaticVerification config param
    private docChangeDelay: number = 0; // dafny.automaticVerificationDelayMS config param
    private subscriptions: vscode.Disposable[];
    private dafnyStatusbar: Statusbar;
    private dafnyServer: DafnyServer;
    private context: Context;

    constructor() {
        this.diagCol = vscode.languages.createDiagnosticCollection(EnvironmentConfig.Dafny);

        const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);
        this.docChangeVerify = config.get<boolean>("automaticVerification");
        this.docChangeDelay = config.get<number>("automaticVerificationDelayMS");

        this.context = new Context();
        this.dafnyStatusbar = new Statusbar(this.context);
        this.dafnyServer = new DafnyServer(this.dafnyStatusbar, this.context);

        this.dafnyServer.reset();
    }

public activate(subs: vscode.Disposable[]): void {
        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
            if (editor) { // may be undefined
                this.dafnyStatusbar.update();
            }
        }, this);
        this.subscriptions = subs;
        vscode.workspace.onDidOpenTextDocument(this.doVerify, this);
        vscode.workspace.onDidCloseTextDocument((textDocument) => {
            this.diagCol.delete(textDocument.uri);
        }, this);

        vscode.workspace.onDidChangeTextDocument(this.docChanged, this);
        vscode.workspace.onDidSaveTextDocument(this.doVerify, this);
        vscode.workspace.textDocuments.forEach(this.doVerify, this); // verify each active document
    }

    public dispose(): void {
        this.diagCol.clear();
        this.diagCol.dispose();
        if(this.subscriptions && this.subscriptions.length > 0) {
            for(let i: number = 0; i < this.subscriptions.length; i++) {
                this.subscriptions[i].dispose();
            }
        }
    }

    public resetServer(): void {
        this.dafnyServer.reset();
    }

    private doVerify(textDocument: vscode.TextDocument): void {
        if (textDocument.languageId === EnvironmentConfig.Dafny) {
            this.dafnyServer.addDocument(textDocument);
        }
    }

    private docChanged(change: vscode.TextDocumentChangeEvent): void {
        if (change.document.languageId === EnvironmentConfig.Dafny) {
            // todo: check if this is too slow to be done every time
            if (this.docChangeVerify) {
                const now: number = Date.now();
                const docName: string = change.document.fileName;

                let changeRecord: DocChangeTimerRecord = null;
                if (this.docChangeTimers[docName]) {
                    changeRecord = this.docChangeTimers[docName];
                } else {
                    changeRecord = new DocChangeTimerRecord(change.document, now);
                    this.docChangeTimers[docName] = changeRecord;
                }
                changeRecord.active = true;
                changeRecord.lastChange = now;
            }
        }
    }

}

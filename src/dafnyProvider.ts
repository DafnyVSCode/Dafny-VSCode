/// <reference path="../typings/index.d.ts" />

"use strict";


// vscode
import * as vscode from "vscode";

// external
import {DafnyServer} from "./dafnyServer";
import {Statusbar} from "./dafnyStatusbar";
import {Context} from "./Context";

class DocChangeTimerRecord {
    public active: boolean = false;
    constructor (
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

    private dafnyStatusbar : Statusbar;
    private dafnyServer : DafnyServer;
    private context : Context;

    constructor() {
        this.diagCol = vscode.languages.createDiagnosticCollection("dafny");

        let config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("dafny");
        this.docChangeVerify = config.get<boolean>("automaticVerification");
        this.docChangeDelay = config.get<number>("automaticVerificationDelayMS");

        this.context = new Context();
        this.dafnyStatusbar = new Statusbar(this.context);
        this.dafnyServer = new DafnyServer(this.dafnyStatusbar, this.context);

        this.dafnyServer.reset();
    }

    public resetServer(): void {
        this.dafnyServer.reset();
    }


    private doVerify(textDocument: vscode.TextDocument): void {
        if (textDocument.languageId === "dafny") {
            this.dafnyStatusbar.update();
            this.dafnyServer.addDocument(textDocument);
        }
    }

    private docChanged(change: vscode.TextDocumentChangeEvent): void {
        if (change.document.languageId === "dafny") {
            // todo: check if this is too slow to be done every time
            if (this.docChangeVerify) {
                let now: number = Date.now();
                let docName: string = change.document.fileName;

                let rec: DocChangeTimerRecord = null;
                if (this.docChangeTimers[docName]) {
                    rec = this.docChangeTimers[docName];
                } else {
                    rec = new DocChangeTimerRecord(change.document, now);
                    this.docChangeTimers[docName] = rec;
                }

                rec.active = true;
                rec.lastChange = now;

                /*if (change.document === vscode.window.activeTextEditor.document) {
                    this.currentDocStatucBarTxt.text = "$(clock)Typing..";
                }*/
            }
        }
    }


    public activate(subs: vscode.Disposable[]): void {
        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
            if (editor) { // may be undefined
                this.dafnyStatusbar.update();
            }
        }, this);

        vscode.workspace.onDidOpenTextDocument(this.doVerify, this);
        vscode.workspace.onDidCloseTextDocument((textDocument)=> {
            this.diagCol.delete(textDocument.uri);
        }, this);

        vscode.workspace.onDidChangeTextDocument(this.docChanged, this);
        vscode.workspace.onDidSaveTextDocument(this.doVerify, this);
        vscode.workspace.textDocuments.forEach(this.doVerify, this); // verify each active document
    }

    public dispose(): void {
        this.diagCol.clear();
        this.diagCol.dispose();
        // vscode.window.showInformationMessage("DafnyProvder disposed");
    }
}
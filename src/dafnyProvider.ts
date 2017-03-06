/// <reference path="../typings/index.d.ts" />

'use strict';

//node
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;
import * as querystring from 'querystring';

//vscode
import * as vscode from 'vscode';

//external
import * as b64 from 'base64-js';
import * as utf8 from 'utf8';

import {DafnyServer} from './dafnyServer';
import {Statusbar} from './dafnyStatusbar';
import {VerificationResults} from './VerificationResults';


class DocChangeTimerRecord {
    public active: boolean = false;
    constructor (
        public doc: vscode.TextDocument,
        public lastChange: number //epoch ms (use Date.now())
    ) {}
}

export class DafnyDiagnosticsProvider {
    private diagCol: vscode.DiagnosticCollection = null;

    //onTextChanged events are sent on each character change,
    //but we only want to send a verification request after a bunch of changes are done
    private docChangeTimers: { [docPathName: string]: DocChangeTimerRecord } = {};
    private docChangeVerify: boolean = false; //dafny.automaticVerification config param
    private docChangeDelay: number = 0; //dafny.automaticVerificationDelayMS config param

    private currentEditor: vscode.TextEditor = null;
    
    private dafnyStatusbar : Statusbar;
    private dafnyServer : DafnyServer;
    private verificationResults : VerificationResults;

    constructor() {
        this.currentEditor = vscode.window.activeTextEditor;
        this.diagCol = vscode.languages.createDiagnosticCollection("dafny");
        
        let config = vscode.workspace.getConfiguration("dafny");
        this.docChangeVerify = config.get<boolean>("automaticVerification");
        this.docChangeDelay = config.get<number>("automaticVerificationDelayMS");

        this.verificationResults = new VerificationResults();
        this.dafnyStatusbar = new Statusbar(this.currentEditor, this.verificationResults);
        this.dafnyServer = new DafnyServer(this.dafnyStatusbar, this.verificationResults);

        this.dafnyServer.reset();
    }

    public resetServer() {
        this.dafnyServer.reset();
    }

    
    private doVerify(textDocument: vscode.TextDocument) {
        if (textDocument.languageId === 'dafny') {
            this.dafnyStatusbar.update();
            this.dafnyServer.addDocument(textDocument);
        } 
    }

    private docChanged(change: vscode.TextDocumentChangeEvent) {
        if (change.document.languageId === 'dafny') {
            //TODO: check if this is too slow to be done every time
            if (this.docChangeVerify) {
                let now = Date.now();
                let docName = change.document.fileName;

                let rec: DocChangeTimerRecord = null;
                if (this.docChangeTimers[docName]) {
                    rec = this.docChangeTimers[docName];
                }
                else {
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

    
    
    public activate(subs: vscode.Disposable[]) {
        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
            if (editor) { //may be undefined
                this.currentEditor = editor;
                this.dafnyStatusbar.update();
            }
        }, this);

        vscode.workspace.onDidOpenTextDocument(this.doVerify, this);
        vscode.workspace.onDidCloseTextDocument((textDocument)=> {
            this.diagCol.delete(textDocument.uri);
        }, this);

        vscode.workspace.onDidChangeTextDocument(this.docChanged, this);
        vscode.workspace.onDidSaveTextDocument(this.doVerify, this);
        vscode.workspace.textDocuments.forEach(this.doVerify, this); //verify each active document
    }
    
    public dispose() {
        this.diagCol.clear();
        this.diagCol.dispose();
        //vscode.window.showInformationMessage("DafnyProvder disposed");
    }
}
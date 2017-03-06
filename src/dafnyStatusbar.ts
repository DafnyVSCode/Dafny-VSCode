'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {VerificationResult, VerificationResults} from './verificationResults';
import {ServerStatus} from './serverStatus';
import {VerificationRequest} from './VerificationRequest';

export class Statusbar {

    public pid : Number;
    private results : VerificationResults;

    //used to display information about the progress of verification
    private verificationStatusBarTxt: vscode.StatusBarItem = null;

    //used to display typing/verifying/error count status
    private currentDocStatucBarTxt: vscode.StatusBarItem = null;

    private static StatusBarVerified = "$(thumbsup) Verified";
    private static StatusBarNotVerified = "$(thumbsdown) Not verified";

    public activeRequest : VerificationRequest;
    
    private serverStatus : ServerStatus;

    private currentEditor: vscode.TextEditor = null;

    constructor(currentEditor: vscode.TextEditor, results: VerificationResults) {
        this.currentEditor = currentEditor;
        this.results = results;
        this.currentDocStatucBarTxt = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
        this.verificationStatusBarTxt = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);

        this.serverStatus = ServerStatus.StatusBarServerOff;
    }

    private verificationResultToString (res: VerificationResult): string {
        switch(res){
            case VerificationResult.Verified: return Statusbar.StatusBarVerified;
            case VerificationResult.NotVerified: return Statusbar.StatusBarNotVerified;
        }
        return "$(x) Verification technical error";
    }

    public hide() {
        this.verificationStatusBarTxt.hide();
        this.currentDocStatucBarTxt.hide();
    }

    public update()  {

        let editor = this.currentEditor;
        //editor.document is a get() that can try to resolve an undefined value
        let editorsOpen = vscode.window.visibleTextEditors.length;
        if (!editor || editorsOpen == 0 || editor.document.languageId !== 'dafny') {
            //disable UI on other doc types or when vscode.window.activeTextEditor is undefined
            this.verificationStatusBarTxt.hide();
            this.currentDocStatucBarTxt.hide();
            return;
        }

        this.verificationStatusBarTxt.text = "";

        /*if (!this.dafnyServer.isRunning()) {
            this.currentDocStatucBarTxt.text = DafnyDiagnosticsProvider.StatusBarServerOff;
            this.verificationStatusBarTxt.text = "$(x)DafnyServer not started";
            return;
        }*/
       

        /*if (this.dafnyServer.isActive()) {
            let remaining = this.dafnyServer.remainingRequests();

            //set status bar text
            this.verificationStatusBarTxt.text = "$(beaker)Verifying " + this.activeRequest.doc.fileName;
            if (remaining > 0) this.verificationStatusBarTxt.text += " (+ " + remaining.toString(10) + " queued)";
        }
        else {
            this.verificationStatusBarTxt.text = "$(watch)DafnyServer idle";
        }*/
        this.verificationStatusBarTxt.text += " (pid " + this.pid + ")";

        if (this.activeRequest && editor.document === this.activeRequest.doc) {
            this.currentDocStatucBarTxt.text = ServerStatus.StatusBarVerifying.message;
        }
        /*else if (this.queuedRequests[editor.document.fileName]) {
            this.currentDocStatucBarTxt.text = DafnyDiagnosticsProvider.StatusBarQueued;
        }*/
        else {
            let res: undefined | VerificationResult = this.results.latestResults[editor.document.fileName];
            if (res !== undefined) {
                this.currentDocStatucBarTxt.text = this.verificationResultToString(res);
            }
        }
        
        this.verificationStatusBarTxt.show();
        this.currentDocStatucBarTxt.show();
        
    }

    public changeStatus(status : ServerStatus) {
        this.serverStatus = status;
        this.update();
    }
}
"use strict";
import { Strings } from "./stringRessources";
import * as vscode from "vscode";

import {VerificationResult} from "./VerificationResults";
import {ServerStatus} from "./serverStatus";
import {VerificationRequest} from "./VerificationRequest";
import {Context} from "./Context";

class Priority {
    static low: number = 1;
    static medium: number = 5;
    static high: number = 10;
}
export class Statusbar {

    public pid : Number;

    // used to display information about the progress of verification
    private serverStatusBar: vscode.StatusBarItem = null;

    // used to display typing/verifying/error count status
    private currentDocumentStatucBar: vscode.StatusBarItem = null;

    private static CurrentDocumentStatusBarVerified = Strings.Verified;
    private static CurrentDocumentStatusBarNotVerified = Strings.NotVerified;

    public activeRequest : VerificationRequest;
    private serverStatus : string;

    constructor(private context : Context) {
        this.currentDocumentStatucBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Priority.high);
        this.serverStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Priority.low);
    }

    private verificationResultToString (request: VerificationResult): string {
        switch(request) {
            case VerificationResult.Verified: return Statusbar.CurrentDocumentStatusBarVerified;
            case VerificationResult.NotVerified: return Statusbar.CurrentDocumentStatusBarNotVerified;
        }
        return Strings.TechnicalError;
    }

    public hide(): void {
        this.serverStatusBar.hide();
        this.currentDocumentStatucBar.hide();
    }

    public remainingRequests(): Number {
        return -1;
    }


    public update(): void  {

        const editor: vscode.TextEditor = vscode.window.activeTextEditor;
        // editor.document is a get() that can try to resolve an undefined value
        const editorsOpen: number = vscode.window.visibleTextEditors.length;
        if (!editor || editorsOpen === 0 || editor.document.languageId !== "dafny") {
            // disable UI on other doc types or when vscode.window.activeTextEditor is undefined
            this.serverStatusBar.hide();
            this.currentDocumentStatucBar.hide();
            return;
        }

        if(this.pid) {
            this.serverStatusBar.text = Strings.ServerUp;
            this.serverStatusBar.text += " (pid " + this.pid + ")";
            this.serverStatusBar.text += " | " + this.serverStatus + " | ";
            this.serverStatusBar.text += "Queue: " + this.remainingRequests() + " |";
        } else {
            this.serverStatusBar.text = Strings.ServerDown;
        }

        if (this.activeRequest && editor.document === this.activeRequest.doc) {
            this.currentDocumentStatucBar.text = ServerStatus.StatusBarVerifying.message;
        } else if (this.context.queuedRequests[editor.document.fileName]) {
            this.currentDocumentStatucBar.text = Strings.Queued;
        } else {
            let res: undefined | VerificationResult = this.context.verificationResults.latestResults[editor.document.fileName];
            if (res !== undefined) {
                const displayText = this.verificationResultToString(res);
                this.currentDocumentStatucBar.text = displayText;
            } else {
                this.currentDocumentStatucBar.text = Strings.Error;
            }
        }
        this.serverStatusBar.show();
        this.currentDocumentStatucBar.show();
    }

    public changeServerStatus(status : string): void {
        this.serverStatus = status;
        this.update();
    }
}
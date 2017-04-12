"use strict";
import * as vscode from "vscode";
import {EnvironmentConfig, StatusString, LanguageServerNotification} from "./stringRessources";
import {VerificationResult} from "./verificationResult";
import { LanguageClient } from "vscode-languageclient";


class Priority {
    public static low: number = 1;
    public static medium: number = 5;
    public static high: number = 10;
}

export class Statusbar {

    private serverStatusBar: vscode.StatusBarItem = null;
    private currentDocumentStatucBar: vscode.StatusBarItem = null;
    public serverStatus: string;
    public queueSize: number;
    public serverpid: number;
    public serverversion: string;
    public activeDocument: vscode.Uri;
    public verificationResults: { [docPathName: string]: VerificationResult } = {};

    constructor(languageServer: LanguageClient) {
        this.currentDocumentStatucBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Priority.high);
        this.serverStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Priority.high);

        languageServer.onNotification(LanguageServerNotification.QueueSize, (queueSize: number) => {
            this.queueSize = queueSize;
            this.update();
        });

        languageServer.onNotification(LanguageServerNotification.ServerStarted, (serverpid: number, serverversion: string) => {
            this.serverpid = serverpid;
            this.serverversion = serverversion;
            this.update();
        });

        languageServer.onNotification(LanguageServerNotification.ActiveVerifiyingDocument, (activeDocument: vscode.Uri) => {
            this.activeDocument = activeDocument;
            this.update();
        });

        languageServer.onNotification(LanguageServerNotification.VerificationResult,
            (docPathName: string, verificationResult: VerificationResult) => {
                console.log("notificiation: " + docPathName);
            this.verificationResults[docPathName] = verificationResult;
            this.update();
        });

        languageServer.onNotification(LanguageServerNotification.HideStatusbar, () => {
            this.hide();
        });
        
        languageServer.onNotification(LanguageServerNotification.ChangeServerStatus, (status: string) => {
            this.serverStatus = status;
            this.update();
        });


    }

    public hide(): void {
        this.serverStatusBar.hide();
        this.currentDocumentStatucBar.hide();
    }

    public remainingRequests(): number {
        return this.queueSize;
    }

    public update(): void  {
        const editor: vscode.TextEditor = vscode.window.activeTextEditor;
        const editorsOpen: number = vscode.window.visibleTextEditors.length;
        if (!editor || editorsOpen === 0 || editor.document.languageId !== EnvironmentConfig.Dafny) {
            this.serverStatusBar.hide();
            this.currentDocumentStatucBar.hide();
            return;
        }

        if(this.serverpid) {
            this.serverStatusBar.text = StatusString.ServerUp;
            this.serverStatusBar.text += " (pid " + this.serverpid + ")";
            this.serverStatusBar.text += " | Version " + this.serverversion + ")";
            this.serverStatusBar.text += " | " + this.serverStatus + " | ";
            this.serverStatusBar.text += "Queue: " + this.remainingRequests() + " |";
        } else {
            this.serverStatusBar.text = StatusString.ServerDown;
        }

        if(!this.serverpid) {
            this.currentDocumentStatucBar.text = StatusString.Pending;
        } else if (this.activeDocument && editor.document.uri === this.activeDocument) {
            this.currentDocumentStatucBar.text = StatusString.Verifying;
        } else if (this.queueContains(/*editor.document.fileName*/)) {
            this.currentDocumentStatucBar.text = StatusString.Queued;
        } else {
            const res: undefined | VerificationResult = this.verificationResults[editor.document.uri.toString()];
            if (res !== undefined) {
                const displayText: string = this.verificationResultToString(res);
                this.currentDocumentStatucBar.text = displayText;
            } else {
                this.currentDocumentStatucBar.text = "unknown";
            }
        }

        

        this.serverStatusBar.show();
        this.currentDocumentStatucBar.show();
    }

    private verificationResultToString(result: VerificationResult): string {
        let response: string = "";

        if(result.crashed) {
            return StatusString.Crashed;
        }

        if(result.errorCount === 0) {
            response = StatusString.Verified;
        } else {
            response = StatusString.NotVerified;
        }
        response += " | Proof Obligations: " + result.proofObligations + " | Errors: " + result.errorCount + " | ";

        return response;
    }

    private queueContains(/*filename: string*/): boolean {
        let found: boolean = false;
        /*this.context.queue.forEach((request: VerificationRequest): void => {
            if(request.document.fileName === filename) {
                found = true;
            }
        });*/
        return found;
    }
}

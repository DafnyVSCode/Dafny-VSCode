"use strict";
import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient";

import { EnvironmentConfig, LanguageServerNotification, StatusString } from "./stringRessources";
import { VerificationResult } from "./verificationResult";
import { Context } from "./context";

class Priority {
    public static low: number = 1;
    public static medium: number = 5;
    public static high: number = 10;
}

export class Statusbar {
    public serverStatus: string;
    public queueSize: number = 0;
    public serverpid: number;
    public serverversion: string;
    public activeDocument: vscode.Uri;
    private serverStatusBar: vscode.StatusBarItem = null;
    private progressBar: vscode.StatusBarItem = null;
    private currentDocumentStatucBar: vscode.StatusBarItem = null;

    constructor(languageServer: LanguageClient, private context: Context) {
        this.currentDocumentStatucBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Priority.high);
        this.progressBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Priority.high);
        this.serverStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Priority.high);

        languageServer.onNotification(LanguageServerNotification.QueueSize, (queueSize: number) => {
            this.queueSize = queueSize === undefined ? 0 : queueSize;
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

        languageServer.onNotification(LanguageServerNotification.ChangeServerStatus, (status: string) => {
            this.serverStatus = status;
            this.update();
        });

        languageServer.onNotification(LanguageServerNotification.Progress, (data: any) => {
            if (!data) return;

            const progress = (data.progress !== undefined) ? data.progress : 100.0 * data.current / data.total;
            const label = data.domain + ": " + this.progressBarText(progress) + (data.postfix ? ' ' + data.postfix : '');
            this.progressBar.text = label;
            this.progressBar.color = 'orange';
            this.progressBar.show();
        });
    }

    public hideProgress() {
        this.progressBar.hide();
    }

    public formatProgress(progress: number): string {
        if (!progress) return "0%";
        return progress.toFixed(0) + "%";
    }

    public progressBarText(progress: number): string {
        if (progress < 0) progress = 0;
        if (progress > 100) progress = 100;
        let completed = Math.floor(progress / 10);
        return "⚫".repeat(completed) + " (" + this.formatProgress(progress) + ") " + "⚪".repeat(10 - completed);
    }

    public hide(): void {
        this.serverStatusBar.hide();
        this.currentDocumentStatucBar.hide();
    }

    public update(): void {
        const editor: vscode.TextEditor = vscode.window.activeTextEditor;
        const editorsOpen: number = vscode.window.visibleTextEditors.length;
        if (!editor || editorsOpen === 0 || editor.document.languageId !== EnvironmentConfig.Dafny) {
            this.hide();
            return;
        }

        if (this.serverpid) {
            this.serverStatusBar.text = StatusString.ServerUp;
            this.serverStatusBar.text += " (pid " + this.serverpid + ")";
            this.serverStatusBar.text += " | Version " + this.serverversion.trim() + " | " + this.serverStatus + " | ";
            this.serverStatusBar.text += "Queue: " + this.queueSize + " |";
        } else {
            this.serverStatusBar.text = StatusString.ServerDown;
        }

        if (!this.serverpid) {
            this.currentDocumentStatucBar.text = StatusString.Pending;
        } else if (this.activeDocument && editor.document.uri === this.activeDocument) {
            this.currentDocumentStatucBar.text = StatusString.Verifying;
        } else if (this.queueContains(editor.document.uri.toString())) {
            this.currentDocumentStatucBar.text = StatusString.Queued;
        } else {
            const res: undefined | VerificationResult = this.context.verificationResults[editor.document.uri.toString()];
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

        if (result.crashed) {
            return StatusString.Crashed;
        }

        if (result.errorCount === 0) {
            response = StatusString.Verified;
        } else {
            response = StatusString.NotVerified;
        }
        response += " | Proof Obligations: " + result.proofObligations + " | Errors: " + result.errorCount;
        if (result.counterModel && result.counterModel.States) { response += " | CM: " + result.counterModel.States.length; }

        return response;
    }

    private queueContains(filename: string): boolean {
        return this.context.localQueue.contains(filename);
    }
}

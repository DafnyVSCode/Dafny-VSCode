"use strict";
import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient";

import { Context } from "./context";
import { IVerificationResult } from "./IVerificationResult";
import { StatusbarPriority } from "./StatusbarPriority";
import { EnvironmentConfig, LanguageServerNotification, StatusString } from "./stringRessources";

export class Statusbar {
    public serverStatus: string | undefined;
    public queueSize: number = 0;
    public serverpid: number | undefined;
    public serverversion: string | undefined;
    public activeDocument: vscode.Uri | undefined;
    private serverStatusBar: vscode.StatusBarItem;
    private progressBar: vscode.StatusBarItem;
    private currentDocumentStatucBar: vscode.StatusBarItem;

    constructor(languageServer: LanguageClient, private context: Context) {
        this.currentDocumentStatucBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, StatusbarPriority.high);
        this.progressBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, StatusbarPriority.high);
        this.serverStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, StatusbarPriority.high);

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
            let label = data.domain;
            if (data.current) {
                const progress = (data.progress !== undefined) ? data.progress : 100.0 * data.current / data.total;
                label = data.domain + ": " + this.progressBarText(progress);
            }
            this.progressBar.text = label;
            this.progressBar.color = "orange";
            this.progressBar.show();
        });
    }

    public hideProgress() {
        this.progressBar.hide();
    }

    public formatProgress(progress: number): string {
        if (!progress) { return "0%"; }
        return progress.toFixed(0) + "%";
    }

    public progressBarText(progress: number): string {
        if (progress < 0) { progress = 0; }
        if (progress > 100) { progress = 100; }
        const completed = Math.floor(progress / 10);
        return "⚫".repeat(completed) + " (" + this.formatProgress(progress) + ") " + "⚪".repeat(10 - completed);
    }

    public hide(): void {
        this.serverStatusBar.hide();
        this.currentDocumentStatucBar.hide();
    }

    public update(): void {
        const editor = vscode.window.activeTextEditor;
        const editorsOpen: number = vscode.window.visibleTextEditors.length;
        if (!editor || editorsOpen === 0 || editor.document.languageId !== EnvironmentConfig.Dafny) {
            this.hide();
            return;
        }

        if (this.serverpid && this.serverversion) {
            this.serverStatusBar.text = `${StatusString.ServerUp} | ${this.serverStatus} | Queue: ${this.queueSize}`;
            this.serverStatusBar.tooltip = `Dafny Version ${this.serverversion.trim()} | Dafny PID ${this.serverpid}`;

        } else {
            this.serverStatusBar.text = StatusString.ServerDown;
        }

        if (!this.serverpid) {
            this.currentDocumentStatucBar.text = StatusString.Pending;
        } else if (this.activeDocument && editor.document.uri.toString() === this.activeDocument.toString()) {
            this.currentDocumentStatucBar.text = StatusString.Verifying;
        } else if (this.queueContains(editor.document.uri.toString())) {
            this.currentDocumentStatucBar.text = StatusString.Queued;
        } else {
            const res: undefined | IVerificationResult = this.context.verificationResults[editor.document.uri.toString()];
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

    private verificationResultToString(result: IVerificationResult): string {
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

        return response;
    }

    private queueContains(filename: string): boolean {
        return this.context.localQueue.contains(filename);
    }
}

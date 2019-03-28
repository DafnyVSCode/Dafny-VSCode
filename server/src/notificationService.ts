"use strict";

import { IConnection, PublishDiagnosticsParams } from "vscode-languageserver";
import { LanguageServerNotification } from "./strings/stringRessources";

export class NotificationService {
    private lastProgress: number = 0;
    constructor(private connection: IConnection) { }

    public sendError(message: string): void {
        this.connection.sendNotification(LanguageServerNotification.Error, message);
    }

    public sendInfo(message: string): void {
        this.connection.sendNotification(LanguageServerNotification.Info, message);
    }

    public sendWarning(message: string): void {
        this.connection.sendNotification(LanguageServerNotification.Warning, message);
    }

    public sendQueueSize(queueSize: number): void {
        this.connection.sendNotification(LanguageServerNotification.QueueSize, queueSize);
    }

    public sendVerificationResult(result: any): void {
        this.connection.sendNotification(LanguageServerNotification.VerificationResult, result);
    }

    public sendServerStarted(information: any): void {
        this.connection.sendNotification(LanguageServerNotification.ServerStarted, information);
    }

    public sendReady(): void {
        this.connection.sendNotification(LanguageServerNotification.Ready);
    }

    public sendDafnyMissing(): void {
        this.connection.sendNotification(LanguageServerNotification.DafnyMissing);
    }

    public sendChangeServerStatus(status: string): void {
        this.connection.sendNotification(LanguageServerNotification.ChangeServerStatus, status);
    }

    public sendActiveVerifiyingDocument(document: string | null): void {
        this.connection.sendNotification(LanguageServerNotification.ActiveVerifiyingDocument, document);
    }

    public sendDiagnostics(params: PublishDiagnosticsParams) {
        this.connection.sendDiagnostics(params);
    }

    public startProgress() {
        this.lastProgress = 0;
    }

    public progress(domain: string, current: number, total: number) {
        const progress = 100.0 * current / total;
        if (Math.floor(progress) > this.lastProgress) {
            this.lastProgress = progress;
            this.connection.sendNotification(LanguageServerNotification.Progress, { domain, current, total });
        }
    }

    public progressText(domain: string) {
        this.connection.sendNotification(LanguageServerNotification.Progress, { domain });
    }
}

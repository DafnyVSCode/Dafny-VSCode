"use strict";

import { IConnection, PublishDiagnosticsParams } from "vscode-languageserver";
import { LanguageServerNotification } from "./strings/stringRessources";

export class NotificationService {

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

    public sendActiveVerifiyingDocument(document: string): void {
        this.connection.sendNotification(LanguageServerNotification.ActiveVerifiyingDocument, document);
    }

    public sendDiagnostics(params: PublishDiagnosticsParams) {
        this.connection.sendDiagnostics(params);
    }
}

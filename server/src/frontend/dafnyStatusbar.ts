"use strict";
import {IConnection} from "vscode-languageserver";
import {Context} from "../backend/context";
import {VerificationRequest} from "../backend/verificationRequest";
import {VerificationResult} from "../backend/verificationResults";
import {EnvironmentConfig, LanguageServerNotification, StatusString} from "../strings/stringRessources";

class Priority {
    public static low: number = 1;
    public static medium: number = 5;
    public static high: number = 10;
}

export class Statusbar {

    constructor(private connection: IConnection) {

    }

    public hide(): void {
        this.connection.sendNotification(LanguageServerNotification.HideStatusbar);
    }

    public changeServerStatus(status: string): void {
        this.connection.sendNotification(LanguageServerNotification.ChangeServerStatus, status);
    }
}

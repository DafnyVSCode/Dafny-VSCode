"use strict";

import { Context } from "../backend/context";
import { VerificationRequest } from "../backend/verificationRequest";
import { VerificationResult } from "../backend/verificationResults";
import { NotificationService } from "../notificationService";
import { EnvironmentConfig, LanguageServerNotification, StatusString } from "../strings/stringRessources";

class Priority {
    public static low: number = 1;
    public static medium: number = 5;
    public static high: number = 10;
}

export class Statusbar {

    constructor(private notificationService: NotificationService) {

    }

    public changeServerStatus(status: string): void {
        this.notificationService.sendChangeServerStatus(status);
    }
}

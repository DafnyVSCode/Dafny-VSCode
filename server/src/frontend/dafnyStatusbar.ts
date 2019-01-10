"use strict";

import { NotificationService } from "../notificationService";

export class Statusbar {

    constructor(private notificationService: NotificationService) {

    }

    public changeServerStatus(status: string): void {
        this.notificationService.sendChangeServerStatus(status);
    }
}

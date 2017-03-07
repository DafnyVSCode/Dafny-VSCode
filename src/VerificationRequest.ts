
"use strict";

import * as vscode from "vscode";

export class VerificationRequest {
    public srcEnds: number[];
    public timeCreated: number;
    public timeSent: number = 0; 
    public timeFinished: number = 0; 
    
    constructor(public source: string, public document: vscode.TextDocument) {
        this.timeCreated = Date.now();

        const lines: string[] = source.split("\n");
        this.srcEnds = new Array(lines.length);

         // tslint:disable-next-line:forin
        for (let index in lines) {
            const line: string = lines[index];
            this.srcEnds[index] = line.length;
        }
    }
}


"use strict";

import * as vscode from "vscode";

export class VerificationRequest {
    public doc: vscode.TextDocument;
    public src: string; // avoid calling doc.getText() again (not sure if it may change while extension code is running)
    public srcEnds: number[];
    public timeCreated: number;
    public timeSent: number = 0; // not known yet
    public timeFinished: number = 0; // not known yet
    public logParseRegex: RegExp = null;

    constructor (src: string, doc: vscode.TextDocument) {
        this.doc = doc;
        this.src = src;
        this.timeCreated = Date.now();

        const lines: string[] = src.split("\n");
        this.srcEnds = new Array(lines.length);

         // tslint:disable-next-line:forin
         for (let index in lines) {
            var line: string = lines[index];
            this.srcEnds[index] = line.length;
        }
    }
}

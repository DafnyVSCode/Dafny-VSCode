
'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export class VerificationRequest {
    public doc: vscode.TextDocument;
    public src: string; //avoid calling doc.getText() again (not sure if it may change while extension code is running)
    public srcEnds: number[];
    public timeCreated: number;
    public timeSent: number = 0; //not known yet
    public timeFinished: number = 0; //not known yet
    public logParseRegex: RegExp = null;

    constructor (src: string, doc: vscode.TextDocument) {
        this.doc = doc;
        this.src = src;
        this.timeCreated = Date.now();

        let lines = src.split('\n');
        this.srcEnds = new Array(lines.length);
        
         for (var li in lines) {
            var line = lines[li];
            this.srcEnds[li] = line.length;
        }

        

    }
}

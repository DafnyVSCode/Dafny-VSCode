
"use strict";

import * as vscode from "vscode";
import {VerificationRequest} from "./VerificationRequest";

export enum VerificationResult {
    Verified = 0,
    NotVerified = 1,
    Failed = 2
};


export class VerificationResults {

    private logParseRegex = new RegExp(".*?\\((\\d+),(\\d+)\\):.*?(Error|Warning|Info)(\\w)?: (.*)");

    public latestResults: { [docPathName: string]: VerificationResult } = {};

    private diagCol: vscode.DiagnosticCollection = null;

    constructor() {
        this.diagCol = vscode.languages.createDiagnosticCollection("dafny");
    }

    public collect(log: string, req : VerificationRequest): void {
        let errorCount: number = this.parseVerifierLog(log, req);
        let fileName: string = req.doc.fileName;
        this.latestResults[fileName] = (errorCount === 0)? VerificationResult.Verified : VerificationResult.NotVerified;
    }


    // returns number of errors (that is, excluding warnings, infos, etc)
    private parseVerifierLog(log: string, req: VerificationRequest): number {
        let lines: string[] = log.split("\n");
        let diags: vscode.Diagnostic[] = [];
        let errCount: number = 0;

        // tslint:disable-next-line:forin
        for (var li in lines) {
            let line: string = lines[li];
            let m: RegExpExecArray = this.logParseRegex.exec(line);

            if (m) {
                let lineNum: number = parseInt(m[1], 10) - 1; // 1 based
                let colNum: number = Math.max(0, parseInt(m[2], 10) - 1); // ditto, but 0 can appear in some cases
                let typeStr: string = m[3];
                let msgStr: string = m[4] !== undefined? m[4] + ": " + m[5] : m[5];

                let start: vscode.Position = new vscode.Position(lineNum, colNum);
                let line: vscode.TextLine = req.doc.lineAt(start);
                // let rangeOnWord = req.doc.getWordRangeAtPosition(start);
                // let range = rangeOnWord || line.range; //sometimes rangeOnWord in undefined
                let range: vscode.Range = line.range;

                let severity: vscode.DiagnosticSeverity = (typeStr === "Error") ?
                    vscode.DiagnosticSeverity.Error : (typeStr === "Warning")?
                    vscode.DiagnosticSeverity.Warning :
                    vscode.DiagnosticSeverity.Information;

                if (severity === vscode.DiagnosticSeverity.Error) {
                    errCount++;
                }

                diags.push(new vscode.Diagnostic(range, msgStr, severity));
            }
            // todo: extract number of proof obligations
        }
        this.diagCol.set(req.doc.uri, diags);
        return errCount;
    }
}
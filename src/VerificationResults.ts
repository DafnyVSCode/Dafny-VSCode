
"use strict";

import * as vscode from "vscode";
import {VerificationRequest} from "./VerificationRequest";
import { Strings } from "./stringRessources";
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
        const errorCount: number = this.parseVerifierLog(log, req);
        const fileName: string = req.doc.fileName;
        this.latestResults[fileName] = (errorCount === 0)? VerificationResult.Verified : VerificationResult.NotVerified;
    }


    // returns number of errors (that is, excluding warnings, infos, etc)
    private parseVerifierLog(log: string, req: VerificationRequest): number {
        const lines: string[] = log.split("\n");
        const diags: vscode.Diagnostic[] = [];
        let errCount: number = 0;

        // tslint:disable-next-line:forin
        for (var index in lines) {
            const line: string = lines[index];
            const errors: RegExpExecArray = this.logParseRegex.exec(line);

            if (errors) {
                const lineNum: number = parseInt(errors[1], 10) - 1; // 1 based
                const colNum: number = Math.max(0, parseInt(errors[2], 10) - 1); // ditto, but 0 can appear in some cases
                const typeStr: string = errors[3];
                const msgStr: string = errors[4] !== undefined? errors[4] + ": " + errors[5] : errors[5];

                const start: vscode.Position = new vscode.Position(lineNum, colNum);
                const line: vscode.TextLine = req.doc.lineAt(start);
                // let rangeOnWord = req.doc.getWordRangeAtPosition(start);
                // let range = rangeOnWord || line.range; //sometimes rangeOnWord in undefined
                const range: vscode.Range = line.range;

                const severity: vscode.DiagnosticSeverity = (typeStr === Strings.Error) ?
                    vscode.DiagnosticSeverity.Error : (typeStr === Strings.Warning)?
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
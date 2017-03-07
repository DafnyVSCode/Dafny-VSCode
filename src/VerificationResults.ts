
"use strict";

import * as vscode from "vscode";
import {VerificationRequest} from "./VerificationRequest";
import { Strings } from "./stringRessources";
export enum VerificationStatus {
    Verified = 0,
    NotVerified = 1,
    Failed = 2,
};

export class VerificationResult {
    public verificationStatus: VerificationStatus;
    public proofObligations: number;
    public errorCount: number;
    public crashed: boolean = false;
};

export class VerificationResults {
    public latestResults: { [docPathName: string]: VerificationResult } = {};

    private logParseRegex = new RegExp(".*?\\((\\d+),(\\d+)\\):.*?(Error|Warning|Info)(\\w)?: (.*)");
    private numberOfProofObligations = new RegExp(".*?(\\d+).*?(proof).*?(obligations|obligation).*?(verified|error)");
    private diagCol: vscode.DiagnosticCollection = null;

    constructor() {
        this.diagCol = vscode.languages.createDiagnosticCollection("dafny");
    }

    public collect(log: string, req: VerificationRequest): void {
        const verificationResult: VerificationResult = this.parseVerifierLog(log, req);
        const fileName: string = req.document.fileName;
        this.latestResults[fileName] = verificationResult;
    }

    public addCrashed(req : VerificationRequest): void {
        const verificationResult: VerificationResult = new VerificationResult();
        verificationResult.crashed = true;
        const fileName: string = req.document.fileName;
        this.latestResults[fileName] = verificationResult;
    }


    private parseVerifierLog(log: string, req: VerificationRequest): VerificationResult {
        const result = new VerificationResult();
        const lines: string[] = log.split("\n");
        const diags: vscode.Diagnostic[] = [];
        let errorCount: number = 0;
        let proofObligations: number = 0;

        // tslint:disable-next-line:forin
        for (let index in lines) {
            const sourceLine: string = lines[index];
            const errors: RegExpExecArray = this.logParseRegex.exec(sourceLine);
            const proofObligationLine: RegExpExecArray = this.numberOfProofObligations.exec(sourceLine);

            if (errors) {
                const lineNum: number = parseInt(errors[1], 10) - 1; // 1 based
                const colNum: number = Math.max(0, parseInt(errors[2], 10) - 1); // ditto, but 0 can appear in some cases
                const typeStr: string = errors[3];
                const msgStr: string = errors[4] !== undefined? errors[4] + ": " + errors[5] : errors[5];

                const start: vscode.Position = new vscode.Position(lineNum, colNum);
                const line: vscode.TextLine = req.document.lineAt(start);
                // let rangeOnWord = req.doc.getWordRangeAtPosition(start);
                // let range = rangeOnWord || line.range; //sometimes rangeOnWord in undefined
                const range: vscode.Range = line.range;

                const severity: vscode.DiagnosticSeverity = (typeStr === Strings.Error) ?
                    vscode.DiagnosticSeverity.Error : (typeStr === Strings.Warning)?
                    vscode.DiagnosticSeverity.Warning :
                    vscode.DiagnosticSeverity.Information;

                if (severity === vscode.DiagnosticSeverity.Error) {
                    errorCount++;
                }

                diags.push(new vscode.Diagnostic(range, msgStr, severity));
            } else if(proofObligationLine) {
                proofObligations += parseInt(proofObligationLine[1]);
            }
        }
        this.diagCol.set(req.document.uri, diags);
        result.errorCount = errorCount;
        result.proofObligations = proofObligations;
        return result;
    }
}

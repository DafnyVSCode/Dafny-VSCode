"use strict";

import * as vscode from "vscode-languageserver";

import { NotificationService } from "../notificationService";

import { Verification } from "../strings/regexRessources";
import { EnvironmentConfig, Severity } from "../strings/stringRessources";
import { VerificationRequest } from "./verificationRequest";

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
    private diagCol: vscode.PublishDiagnosticsParams;

    constructor(private notificationService: NotificationService) { }

    public collect(log: string, req: VerificationRequest): VerificationResult {
        console.log(log);
        const verificationResult: VerificationResult = this.parseVerifierLog(log, req);
        const fileName: string = req.document.uri;
        this.latestResults[fileName] = verificationResult;
        return verificationResult;
    }

    public addCrashed(req: VerificationRequest): void {
        if (req != null) {
            const verificationResult: VerificationResult = new VerificationResult();
            verificationResult.crashed = true;
            const fileName: string = req.document.uri;
            this.latestResults[fileName] = verificationResult;
        }
    }

    private parseVerifierLog(log: string, req: VerificationRequest): VerificationResult {
        const result: VerificationResult = new VerificationResult();
        const lines: string[] = log.split(EnvironmentConfig.NewLine);
        const diags: vscode.Diagnostic[] = [];
        let errorCount: number = 0;
        let proofObligations: number = 0;
        let lastDiagnostic = null;
        let relatedLocationCounter = 1;

        // tslint:disable-next-line:forin
        for (const index in lines) {
            const sourceLine: string = lines[index];
            const errors: RegExpExecArray = Verification.LogParseRegex.exec(sourceLine);
            const proofObligationLine: RegExpExecArray = Verification.NumberOfProofObligations.exec(sourceLine);

            if (errors) {
                const lineNum: number = parseInt(errors[1], 10) - 1; // 1 based
                const colNum: number = Math.max(0, parseInt(errors[2], 10) - 1); // 1 based, but 0 can appear in some cases
                const typeStr: string = errors[3];
                let msgStr: string = errors[4] !== undefined ? errors[4] + ": " + errors[5] : errors[5];

                const start: vscode.Position = vscode.Position.create(lineNum, colNum);
                const end: vscode.Position = vscode.Position.create(lineNum, Number.MAX_VALUE);
                const range: vscode.Range = vscode.Range.create(start, end);

                const severity: vscode.DiagnosticSeverity = (typeStr === Severity.Error) ?
                    vscode.DiagnosticSeverity.Error : (typeStr === Severity.Warning) ?
                        vscode.DiagnosticSeverity.Warning :
                        vscode.DiagnosticSeverity.Information;

                if (severity === vscode.DiagnosticSeverity.Error) {
                    errorCount++;
                }

                const relatedRange = this.checkForRelatedLocation(lines, index, diags, relatedLocationCounter);
                if (relatedRange) {
                    msgStr += " Related location " + relatedLocationCounter + ": Line: " +
                        (relatedRange.start.line + 1) + ", Col: " + (relatedRange.start.character + 1);
                    relatedLocationCounter++;
                }

                lastDiagnostic = vscode.Diagnostic.create(range, msgStr, severity);
                lastDiagnostic.source = "Dafny VSCode";

                diags.push(lastDiagnostic);

            } else if (proofObligationLine) {
                proofObligations += parseInt(proofObligationLine[1], 10);
            }
        }

        const publishDiagnosticsParams: vscode.PublishDiagnosticsParams = { uri: req.document.uri, diagnostics: diags };
        this.notificationService.sendDiagnostics(publishDiagnosticsParams);

        result.errorCount = errorCount;
        result.proofObligations = proofObligations;
        return result;
    }

    private checkForRelatedLocation(lines: string[], index: string,
                                    diags: vscode.Diagnostic[], relatedLocationCounter: number): vscode.Range {
        const nextLine: string = lines[(parseInt(index, 10) + 1).toString()];
        const relatedLocations: RegExpExecArray = Verification.RelatedLocationRegex.exec(nextLine);

        if (relatedLocations) {
            const lineNum: number = parseInt(relatedLocations[1], 10) - 1; // 1 based
            const colNum: number = Math.max(0, parseInt(relatedLocations[2], 10) - 1); // 1 based, but 0 can appear in some cases
            let msgStr: string = relatedLocations[5];

            const start: vscode.Position = vscode.Position.create(lineNum, colNum);
            const end: vscode.Position = vscode.Position.create(lineNum, Number.MAX_VALUE);
            const range: vscode.Range = vscode.Range.create(start, end);
            msgStr = "Related location " + relatedLocationCounter + ". " + msgStr;
            diags.push(vscode.Diagnostic.create(range, msgStr, vscode.DiagnosticSeverity.Warning, undefined, "Dafny VSCode"));

            return range;
        }
    }
}

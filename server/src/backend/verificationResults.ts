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
}

export class VerificationResult {
    public verificationStatus: VerificationStatus;
    public proofObligations: number;
    public errorCount: number;
    public crashed: boolean = false;
    public counterModel: any;
}

export class VerificationResults {
    public latestResults: { [docPathName: string]: VerificationResult } = {};

    constructor(private notificationService: NotificationService) { }

    public collect(log: string, req: VerificationRequest): VerificationResult {
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

        this.addCounterModel(log, result);

        if (log.indexOf("Unknown verb") !== -1) {
            errorCount++;
            diags.push({
                message: "Please upgrade Dafny. The verification can't be executed.",
                range: {
                    end: { character: Number.MAX_VALUE, line: Number.MAX_VALUE },
                    start: { character: 0, line: 0 },
                },
                severity: vscode.DiagnosticSeverity.Error, source: "Dafny VSCode",
            });
        }

        // tslint:disable-next-line:forin
        for (const index in lines) {
            const sourceLine: string = lines[index];
            const errors: RegExpExecArray = Verification.LogParseRegex.exec(sourceLine);
            const proofObligationLine: RegExpExecArray = Verification.NumberOfProofObligations.exec(sourceLine);

            if (errors) {
                const lineNum: number = parseInt(errors[1], 10) - 1; // 1 based
                const colNum: number = Math.max(0, parseInt(errors[2], 10) - 1); // 1 based, but 0 can appear in some cases
                const typeStr: string = errors[3];
                let msgStr: string = errors[4];

                const start: vscode.Position = vscode.Position.create(lineNum, colNum);
                const end: vscode.Position = vscode.Position.create(lineNum, Number.MAX_VALUE);
                const range: vscode.Range = vscode.Range.create(start, end);

                const severity: vscode.DiagnosticSeverity = (typeStr === Severity.Info) ?
                    vscode.DiagnosticSeverity.Information : (typeStr === Severity.Warning) ?
                        vscode.DiagnosticSeverity.Warning :
                        vscode.DiagnosticSeverity.Error;

                if (severity === vscode.DiagnosticSeverity.Error) {
                    errorCount++;
                }

                const relatedRange = this.checkForRelatedLocation(lines, index, diags, relatedLocationCounter);
                if (relatedRange) {
                    msgStr += " Related location " + relatedLocationCounter + ": Line: " +
                        (relatedRange.start.line + 1) + ", Col: " + (relatedRange.start.character + 1);
                    relatedLocationCounter++;
                }

                if (typeStr === Severity.TimedOut) {
                    msgStr += " (timed out)";
                }

                lastDiagnostic = vscode.Diagnostic.create(range, msgStr, severity);
                lastDiagnostic.source = "Dafny VSCode";

                if (!msgStr.startsWith("Selected triggers:")) {
                    diags.push(lastDiagnostic);
                }

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

    private addCounterModel(log: string, result: VerificationResult) {
        if (log && log.indexOf(EnvironmentConfig.CounterExampleStart) > -1 && log.indexOf(EnvironmentConfig.CounterExampleEnd) > -1) {
            const startOfSymbols: number = log.indexOf(EnvironmentConfig.CounterExampleStart) +
                EnvironmentConfig.CounterExampleStart.length;
            const endOfSymbols: number = log.indexOf(EnvironmentConfig.CounterExampleEnd);
            const info: string = log.substring(startOfSymbols, endOfSymbols);
            try {
                result.counterModel = JSON.parse(info);
            } catch (exception) {
                console.error("Failure  to parse response: " + exception + ", json: " + info);
                result.counterModel = null;
            }
        }
    }

    private checkForRelatedLocation(lines: string[], index: string, diags: vscode.Diagnostic[],
                                    relatedLocationCounter: number): vscode.Range {
        const nextLine: string = lines[parseInt(index, 10) + 1];
        const relatedLocations: RegExpExecArray = Verification.RelatedLocationRegex.exec(nextLine);

        if (relatedLocations) {
            const lineNum: number = parseInt(relatedLocations[1], 10) - 1; // 1 based
            const colNum: number = Math.max(0, parseInt(relatedLocations[2], 10) - 1); // 1 based, but 0 can appear in some cases
            let msgStr: string = relatedLocations[3];

            const start: vscode.Position = vscode.Position.create(lineNum, colNum);
            const end: vscode.Position = vscode.Position.create(lineNum, Number.MAX_VALUE);
            const range: vscode.Range = vscode.Range.create(start, end);
            msgStr = "Related location " + relatedLocationCounter + ". " + msgStr;
            diags.push(vscode.Diagnostic.create(range, msgStr, vscode.DiagnosticSeverity.Warning, undefined, "Dafny VSCode"));

            return range;
        }
    }
}

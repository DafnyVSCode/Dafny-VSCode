"use strict";

import * as vscode from "vscode-languageserver";

import { NotificationService } from "../notificationService";

import { Verification } from "../strings/regexRessources";
import { EnvironmentConfig, Severity } from "../strings/stringRessources";
import { IGeneralVerificationResult } from "./IGeneralVerificationResult";
import { VerificationRequest } from "./verificationRequest";
import { VerificationResult } from "./VerificationResult";
import { VerificationResultCrashed } from "./VerificationResultCrashed";

export enum VerificationStatus {
    Verified = 0,
    NotVerified = 1,
    Failed = 2,
}

export class VerificationResults {
    public latestResults: { [docPathName: string]: IGeneralVerificationResult } = {};

    constructor(private notificationService: NotificationService) { }

    public collect(log: string, req: VerificationRequest): VerificationResult {
        const verificationResult: VerificationResult = this.parseVerifierLog(log, req);
        const fileName: string = req.document.uri;
        this.latestResults[fileName] = verificationResult;
        return verificationResult;
    }

    public addCrashed(req: VerificationRequest | undefined): void {
        if (req) {
            const verificationResult = new VerificationResultCrashed();
            const fileName: string = req.document.uri;
            this.latestResults[fileName] = verificationResult;
        }
    }

    private parseVerifierLog(log: string, req: VerificationRequest): VerificationResult {
        const lines: string[] = log.split(EnvironmentConfig.NewLine);
        const diags: vscode.Diagnostic[] = [];
        let errorCount: number = 0;
        let proofObligations: number = 0;
        let lastDiagnostic = null;
        let relatedLocationCounter = 1;

        const counterModel = this.addCounterModel(log);

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

        for (const index of lines.keys()) {
            const sourceLine: string = lines[index];
            const errors = Verification.LogParseRegex.exec(sourceLine);
            const proofObligationLine = Verification.NumberOfProofObligations.exec(sourceLine);

            if (errors !== null) {
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
                } else if (typeStr === Severity.TimedOutAfter)
                {
                    msgStr = "Timed out after " + msgStr;
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

        const result = new VerificationResult(counterModel, errorCount, proofObligations);
        return result;
    }

    private addCounterModel(log: string): any | undefined {
        if (log && log.indexOf(EnvironmentConfig.CounterExampleStart) > -1 && log.indexOf(EnvironmentConfig.CounterExampleEnd) > -1) {
            const startOfSymbols: number = log.indexOf(EnvironmentConfig.CounterExampleStart) +
                EnvironmentConfig.CounterExampleStart.length;
            const endOfSymbols: number = log.indexOf(EnvironmentConfig.CounterExampleEnd);
            const info: string = log.substring(startOfSymbols, endOfSymbols);
            try {
                return JSON.parse(info);
            } catch (exception) {
                console.error("Failure  to parse response: " + exception + ", json: " + info);
                return undefined;
            }
        }
    }

    private checkForRelatedLocation(lines: string[], index: number, diags: vscode.Diagnostic[],
                                    relatedLocationCounter: number): vscode.Range | undefined {
        const nextLine: string = lines[index + 1];
        const relatedLocations = Verification.RelatedLocationRegex.exec(nextLine);

        if (relatedLocations !== null) {
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
        return undefined;
    }
}

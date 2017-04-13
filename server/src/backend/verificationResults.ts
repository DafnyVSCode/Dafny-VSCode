"use strict";

import * as vscode from "vscode-languageserver";
import {IConnection} from "vscode-languageserver";
import { Verification } from "../strings/regexRessources";
import { EnvironmentConfig, Severity } from "../strings/stringRessources";
import {VerificationRequest} from "./verificationRequest";

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

    constructor(private connection: IConnection) {    }

    public collect(log: string, req: VerificationRequest): VerificationResult {
        const verificationResult: VerificationResult = this.parseVerifierLog(log, req);
        const fileName: string = req.document.uri;
        this.latestResults[fileName] = verificationResult;
        return verificationResult;
    }

    public addCrashed(req: VerificationRequest): void {
        if(req != null) {
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

        // tslint:disable-next-line:forin
        for (const index in lines) {
            const sourceLine: string = lines[index];
            const errors: RegExpExecArray = Verification.LogParseRegex.exec(sourceLine);
            const proofObligationLine: RegExpExecArray = Verification.NumberOfProofObligations.exec(sourceLine);

            if (errors) {
                const lineNum: number = parseInt(errors[1], 10) - 1; // 1 based
                const colNum: number = Math.max(0, parseInt(errors[2], 10) - 1); // 1 based, but 0 can appear in some cases
                const typeStr: string = errors[3];
                const msgStr: string = errors[4] !== undefined ? errors[4] + ": " + errors[5] : errors[5];

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

                diags.push(vscode.Diagnostic.create(range, msgStr, severity));
            } else if(proofObligationLine) {
                proofObligations += parseInt(proofObligationLine[1], 10);
            }
        }

        const publishDiagnosticsParams: vscode.PublishDiagnosticsParams = {uri: req.document.uri, diagnostics: diags};
        this.connection.sendDiagnostics(publishDiagnosticsParams);

        result.errorCount = errorCount;
        result.proofObligations = proofObligations;
        return result;
    }
}

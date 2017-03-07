
'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {VerificationRequest} from './VerificationRequest';

export enum VerificationResult {
    Verified = 0,
    NotVerified = 1,
    Failed = 2
};


export class VerificationResults {

    private logParseRegex = new RegExp(".*?\\((\\d+),(\\d+)\\):.*?(Error|Warning|Info)(\\w)?: (.*)");
    private numberOfProofObligations = new RegExp(".*?(\\d+).*?(proof).*?(obligations).*?(verified)");

    public latestResults: { [docPathName: string]: VerificationResult } = {};

    private diagCol: vscode.DiagnosticCollection = null;

    constructor() {
        this.diagCol = vscode.languages.createDiagnosticCollection("dafny");
    }

    public collect(log: string, req : VerificationRequest) {
        let errorCount = this.parseVerifierLog(log, req);
        let fileName = req.doc.fileName;
        
        this.latestResults[fileName] = (errorCount == 0)? VerificationResult.Verified : VerificationResult.NotVerified;
    }


    //returns number of errors (that is, excluding warnings, infos, etc)
    private parseVerifierLog(log: string, req: VerificationRequest): number {
        let lines = log.split('\n');
        let diags: vscode.Diagnostic[] = [];
        let errCount = 0;

        for (var li in lines) {
            let line = lines[li];
            let m = this.logParseRegex.exec(line);

            if (m) {
                let lineNum = parseInt(m[1], 10) - 1; //1 based
                let colNum = Math.max(0, parseInt(m[2], 10) - 1); //ditto, but 0 can appear in some cases
                let typeStr = m[3];
                let msgStr = m[4] !== undefined? m[4] + ": " + m[5] : m[5];

                let start = new vscode.Position(lineNum, colNum);
                let line = req.doc.lineAt(start);
                //let rangeOnWord = req.doc.getWordRangeAtPosition(start);
                //let range = rangeOnWord || line.range; //sometimes rangeOnWord in undefined
                let range = line.range;

                let severity = (typeStr === "Error") ? 
                    vscode.DiagnosticSeverity.Error : (typeStr === "Warning")?
                    vscode.DiagnosticSeverity.Warning :
                    vscode.DiagnosticSeverity.Information;

                if (severity === vscode.DiagnosticSeverity.Error) {
                    errCount++;
                }

                diags.push(new vscode.Diagnostic(range, msgStr, severity));
            }

            //TODO: extract number of proof obligations
        }

        this.diagCol.set(req.doc.uri, diags);
        return errCount;
    }




}
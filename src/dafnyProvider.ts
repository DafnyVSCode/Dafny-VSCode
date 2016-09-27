'use strict';

import * as path from 'path';
import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;
import * as vscode from 'vscode';

var dafnyPath = '';

export default class DafnyDiagnosticsProvider {
    private diagCol: vscode.DiagnosticCollection;

    private doVerify(textDocument: vscode.TextDocument) {
        if (textDocument.languageId === 'Dafny') {
            
            
            let dafnyPath = 'dafny'; //TODO: make option

            let args: string[] = [];

            //0 to stop after typechecking
            //1 to complete translation verification and compilation
            args.push('/dafnyVerify:' + (1).toString()); //TODO: option

            //0 not to compile
            //1 to compile uppon successful verification
            //2 to compile regardless of verification sucess
            //3 compile in-memory if sucessful
            args.push('/compile:' + (0).toString()); //TODO: option

            //suppress logo
            args.push('/nologo');

            let opts: cp.SpawnOptions = {};
            if (vscode.workspace.rootPath) opts.cwd = vscode.workspace.rootPath;
            //env?: any;
            //stdio?: any;
            //detached?: boolean;
            //shell?: boolean | string;

            let child = cp.spawn(dafnyPath, args, opts);

            if (child.pid) {
                let output = '';
                child.stdout.on('data', (data: Buffer) => {
                    output += data;
                });

                child.stdout.on('end', () => {
                    let diags = this.processOutput(output);
                    this.diagCol.set(textDocument.uri, diags);
                });
            }
        }
    }

    private processOutput(output: string): vscode.Diagnostic[] {
        let regexStr = '';
        
        
        let diags: vscode.Diagnostic[] = [];


    }
}
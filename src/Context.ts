
'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {VerificationResult, VerificationResults} from './verificationResults';
import {Statusbar} from './dafnyStatusbar';
import {ServerStatus} from './serverStatus';
import {VerificationRequest} from './VerificationRequest';


export class Context {

    public queuedRequests: { [docPathName: string]: VerificationRequest } = {};

    public verificationResults: VerificationResults = new VerificationResults();

    public activeRequest: VerificationRequest = null;

}
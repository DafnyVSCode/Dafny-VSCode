"use strict";

import * as vscode from "vscode";
import { LocalQueue } from "./serverHelper/localQueue";
import { VerificationResult } from "./verificationResult";

export class Context {
    public verificationResults: { [docPathName: string]: VerificationResult } = {};
    public localQueue: LocalQueue = new LocalQueue();
    public decorators: { [docPathName: string]: vscode.TextEditorDecorationType } = {};
}

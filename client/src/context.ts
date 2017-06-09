"use strict";

import * as vscode from "vscode";
import { UnitTestCallback } from "../test/extension.test";
import { LocalQueue } from "./serverHelper/localQueue";
import { VerificationResult } from "./verificationResult";

export class Context {
    public static unitTest: UnitTestCallback;
    public verificationResults: { [docPathName: string]: VerificationResult } = {};
    public localQueue: LocalQueue = new LocalQueue();
    public decorators: { [docPathName: string]: vscode.TextEditorDecorationType } = {};
}

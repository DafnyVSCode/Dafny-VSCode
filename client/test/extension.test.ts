//
// note: This example test is leveraging the Mocha test framework.
// please refer to their documentation on https://mochajs.org/ for help.
//

// the module 'assert' provides assertion methods from node
import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { Context } from "../src/context";
import { VerificationResult } from "../src/verificationResult";

const extensionID = "FunctionalCorrectness.dafny-vscode";
const samplesFolder = vscode.extensions.getExtension(extensionID).extensionPath + "/test/sampleFolder/";


export class UnitTestCallback {
    backendStarted = () => { };
    verificationComplete = (verificationResult: VerificationResult) => {
        log("Status:" + verificationResult.verificationStatus.toString());
    };
    activated = () => { };
}

Context.unitTest = new UnitTestCallback();

function log(msg: string) {
    console.log("[UnitTest] " + msg);
}

/*function wait(timeout): Promise<boolean> {
    return new Promise((resolve) => {
        setTimeout(function () {
            resolve(true);
        }, timeout);
    });
}*/

function waitForBackendStarted(): Promise<boolean> {
    return new Promise((resolve) => {
        Context.unitTest.backendStarted = () => {
            log("Backend started");
            resolve(true);
        }
    });
}

function waitForVerification(fileName: string, expectedResult: any): Promise<void> {
    return new Promise((resolve) => {
        Context.unitTest.verificationComplete = (verificationResult: VerificationResult) => {
            log("Verification finished: " + fileName);
            log(JSON.stringify(verificationResult));
            resolve(verificationResult);
        }
    }).then((verificationResult) => {
        assert.deepEqual(verificationResult, expectedResult);
    });
}

function waitForCounterExample(fileName: string, isCounterModelEmpty: boolean): Promise<void> {
    return new Promise((resolve) => {
        Context.unitTest.verificationComplete = (verificationResult: VerificationResult) => {
            log("CounterExample finished: " + fileName);
            log(JSON.stringify(verificationResult.counterModel));
            resolve(verificationResult.counterModel);
        }
    }).then((counterModel: any) => {
        if (isCounterModelEmpty) {
			assert.equal(counterModel, undefined, "Model is not empty")
        } else {
            assert.notEqual(counterModel.States.length, 0, "Model is empty");
        }
    });
}

function openFile(fileName: string): Promise<vscode.TextDocument> {
    return new Promise((resolve) => {
        let filePath = path.join(samplesFolder, fileName);
        log("open " + filePath);
        vscode.workspace.openTextDocument(filePath).then(document => {
            vscode.window.showTextDocument(document).then(() => {
                resolve(document);
            });
        });
    });
}

function executeCommand(command: string, args?: any) {
    log(command + (args ? " " + args : ""));
    return vscode.commands.executeCommand(command, args);
}

/*function closeFile(): Thenable<{}> {
    let filePath = path.join(samplesFolder, vscode.window.activeTextEditor.document.fileName);
    log("close " + filePath);
    return vscode.commands.executeCommand("workbench.action.closeActiveEditor");
}*/


suite("DafnyServer Tests", () => {
    // tslint:disable-next-line:only-arrow-functions
    test("Verify simple.dfy", function () {
        log("Language Detection, and Backend Startup test.");
        this.timeout(40000);

        return openFile("simple.dfy").then((document: any) => {
            if (document.languageId !== "dafny") {
                throw new Error("The language of dafny file was not detected correctly: should: dafny, is: " + document.languageId);
            }
            return waitForBackendStarted();
        });
    });

    // tslint:disable-next-line:only-arrow-functions
    test("Verify simple_invalid_assert.dfy", function () {
        log("Test simple verification");
        this.timeout(15000);
        return waitForVerification(samplesFolder + "simple.dfy", { crashed: false, errorCount: 0, proofObligations: 2 });
    });

    // tslint:disable-next-line:only-arrow-functions
    test("Verify countermodel", function () {
        this.timeout(40000);

        return openFile("abs_failing.dfy").then(() => {
            return waitForVerification(samplesFolder + "abs_failing.dfy",
                { crashed: false, errorCount: 1, proofObligations: 1 }).then(() => {
                    executeCommand("dafny.showCounterExample");
                    return waitForCounterExample("abs_failing.dfy", false);
                });
        });
    });

    // tslint:disable-next-line:only-arrow-functions
    test("Verify countermodel empty", function () {
        this.timeout(40000);

        return openFile("simple2.dfy").then(() => {
            return waitForVerification(samplesFolder + "simple2.dfy",
                { crashed: false, errorCount: 0, proofObligations: 2 }).then(() => {
                    executeCommand("dafny.showCounterExample");
                    return waitForCounterExample("simple2.dfy", true);
                });
        });
    });
});


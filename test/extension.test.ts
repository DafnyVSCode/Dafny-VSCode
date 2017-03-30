//
// note: This example test is leveraging the Mocha test framework.
// please refer to their documentation on https://mochajs.org/ for help.
//

// the module 'assert' provides assertion methods from node
import * as assert from "assert";
import * as vscode from "vscode";
import {Context} from "../src/Backend/context";
import {DafnyServer} from "../src/Backend/dafnyServer";
import {DafnyDefinitionProvider} from "../src/Backend/Features/definitionProvider"
import {Statusbar} from "../src/Frontend/dafnyStatusbar";

const extensionID = "FunctionalCorrectness.dafny-vscode";
const samplesFolder = vscode.extensions.getExtension(extensionID).extensionPath + "/test/sampleFolder/";
const tempFolder = samplesFolder;

function getProvider(startFilePath: string, position: vscode.Position, expectedResult: any) {
    let editor: vscode.TextEditor;
    const workingFilePath = tempFolder + startFilePath;
    const dafnyDefinitionProvider = new DafnyDefinitionProvider();
    let actual: any = null;

    const testPromise = vscode.workspace.openTextDocument(workingFilePath).then((workingDocument) => {
        return vscode.window.showTextDocument(workingDocument);
    }).then((_editor) => {
        editor = _editor;
        return dafnyDefinitionProvider.provideDefinition(_editor.document, position);
    }).then((locationFound) => {
        actual = locationFound;
    }).then(() => {
        return vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    });

    return testPromise.then(() => {
        assert.deepEqual(actual.range, expectedResult);
    });
}

function verifyFile(startFilePath: string, expectedResult: any) {
    let editor: vscode.TextEditor;
    const workingFilePath = tempFolder + startFilePath;

    const context: Context = new Context();
    const statusbar: Statusbar = new Statusbar(context);
    const dafnyServer = new DafnyServer(statusbar, context);
    let actual: any = null;

    const testPromise = vscode.workspace.openTextDocument(workingFilePath).then((workingDocument) => {
        return vscode.window.showTextDocument(workingDocument);
    }).then((_editor) => {
        editor = _editor;
        dafnyServer.reset();
        dafnyServer.addDocument(_editor.document);
        return new Promise((f) => setTimeout(f, 10000));
    }).then(() => {
        const result = context.verificationResults.latestResults[editor.document.fileName];
        actual = result;
    }).then(() => {
        return;
    }).then(() => {
        return vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    });

    return testPromise.then(() => {
        assert.deepEqual(actual, expectedResult);
    });
}

suite("DafnyServer Tests", () => {
    test("Verify simple.dfy", function() {
        this.timeout(30000);
        return verifyFile("simple.dfy", { crashed: false, errorCount: 0, proofObligations: 2 });
    });
    test("Verify simple_invalid_assert.dfy", function() {
        this.timeout(30000);
        return verifyFile("simple_invalid_assert.dfy", { crashed: false, errorCount: 1, proofObligations: 1 });
    });
});

suite("DafnyDef Tests", function() {
    test("Verify go to definition", function() {
        this.timeout(30000);
        return getProvider("gotodefinition.dfy", new vscode.Position(6, 13),
            {_end: new vscode.Position(1, 11), _start: new vscode.Position(1, 11)});
    });
    test("Verify go to definition, not available", function() {
        this.timeout(30000);
        return getProvider("gotodefinition.dfy", new vscode.Position(14, 14),
            {_end: new vscode.Position(5, 11), _start: new vscode.Position(5, 11)});
    });
});

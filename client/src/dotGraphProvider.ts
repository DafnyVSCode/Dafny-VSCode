"use strict";

import * as fs from "fs";
import * as vscode from "vscode";
const viz = require("viz.js");
import { LanguageClient } from "vscode-languageclient";
import { TextDocumentItem } from "vscode-languageserver-types";
import { LanguageServerRequest } from "./stringRessources";

export class DotGraphProvider implements vscode.TextDocumentContentProvider {

    constructor(private languageServer: LanguageClient) {

    }

    public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        return new Promise((resolve, reject) => {
            let content = "<h1>" + uri.fsPath + "</h1>";
            content += "2";
            const textDocument = vscode.window.activeTextEditor.document;
            const tditem = JSON.stringify(TextDocumentItem.create(textDocument.uri.toString(),
                textDocument.languageId, textDocument.version, textDocument.getText()));
            const filename = vscode.window.activeTextEditor.document.uri.fsPath.split("/").pop().split("\\").pop();
            console.log("**/*" + filename + "*.dot");
            this.languageServer.sendRequest(LanguageServerRequest.Dotgraph, tditem).then(() => {
                vscode.workspace.findFiles("**/*" + filename + "*.dot", "**/node_modules/**").then((files) => {
                    let graphs = "";
                    for (const file of files) {
                        const filecontent = this.getSvgContent(file.fsPath);
                        const header = file.fsPath.substring(file.fsPath.indexOf("$$") + 2, file.fsPath.length - 4);
                        graphs += "<h3>" + header + "</h3>";
                        graphs += this.generateSvg(filecontent);
                    }
                    const htmlContent = this.buildHtml(graphs);
                    resolve(htmlContent);
                }, (e) => { vscode.window.showErrorMessage("Can't show graph: " + e); reject(e); });
            }, (e) => {
                vscode.window.showErrorMessage("Can't show graph: " + e);
                reject(e);
            });
        });
    }

    public buildHtml(graphs: string): string {
        return `<!DOCTYPE html>
<html lang="en"><head>
<style>
 table td, table td * {
  vertical-align: top;
 }
 svg {
     max-height: 500px;
 }
</style>
</head>
<body>
 ${graphs}
</body>
</html>`;
    }

    public getSvgContent(filePath: string): string {
        return fs.readFileSync(filePath).toString();
    }

    public generateSvg(data: string): string {
        try {
            const result = viz(data, { format: "svg", engine: "dot" });
            if (!result) {
                console.error("cannot generate svg from data");
                return "";
            }
            return result;
        } catch (e) {
            console.error("error generating svg from data: " + e);
        }
        return "";
    }
}

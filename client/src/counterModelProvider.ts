"use strict";

import * as vscode from "vscode";
import { Context } from "./context";
import { VerificationResult } from "./verificationResult";

export class CounterModelProvider {

    constructor(private context: Context) { }

    public update() {
        const editor: vscode.TextEditor = vscode.window.activeTextEditor;

        const res: undefined | VerificationResult = this.context.verificationResults[editor.document.uri.toString()];

        if (res !== undefined && res.counterModel && res.counterModel.States) {
            if (this.context.decorators[editor.document.uri.toString()]) {
                this.context.decorators[editor.document.uri.toString()].dispose();
            }

            const decorators: vscode.DecorationOptions[] = [];
            for (const state of res.counterModel.States) {
                const decorator = this.createDecorator(state);
                if (decorator) {
                    decorators.push(decorator);
                }
            }

            const variableDisplay = vscode.window.createTextEditorDecorationType({
                dark: {
                    after: {
                        backgroundColor: "#cccccc",
                        color: "#161616",
                        margin: "0 0 0 30px"
                    }
                },
                light: {
                    after: {
                        backgroundColor: "#161616",
                        color: "#cccccc"
                    }
                }
            });
            this.context.decorators[editor.document.uri.toString()] = variableDisplay;
            vscode.window.activeTextEditor.setDecorations(variableDisplay, decorators);
        }
    }

    private createDecorator(state: any): vscode.DecorationOptions {

        const line = state.Line - 1;
        if (line < 0) { return null; };

        let variables = "";
        for (let j = 0; j < state.Variables.length; j++) {
            if (j > 0) { variables += ", "; };
            variables += state.Variables[j].Name + "=" + state.Variables[j].Value;
        }

        const renderOptions: vscode.DecorationRenderOptions = {
            after: {
                contentText: variables
            }
        };

        return {
            range: new vscode.Range(new vscode.Position(line, state.Column), new vscode.Position(line, Number.MAX_VALUE)),
            renderOptions
        };
    }
}

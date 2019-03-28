"use strict";

import * as vscode from "vscode";
import { Context } from "./context";
import { IVerificationResult } from "./IVerificationResult";

export class CounterModelProvider {

    constructor(private context: Context) { }

    public update() {
        // TODO: Refactor editor window out and check for existance
        const editor: vscode.TextEditor = vscode.window.activeTextEditor!;

        const res: undefined | IVerificationResult = this.context.verificationResults[editor.document.uri.toString()];

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
                        margin: "0 0 0 30px",
                    },
                },
                light: {
                    after: {
                        backgroundColor: "#161616",
                        color: "#cccccc",
                    },
                },
            });
            this.context.decorators[editor.document.uri.toString()] = variableDisplay;
            editor.setDecorations(variableDisplay, decorators);
        }
    }

    private createDecorator(state: any): vscode.DecorationOptions | null {

        const line = state.Line - 1;
        if (line < 0) { return null; }

        let variables = "";
        for (let j = 0; j < state.Variables.length; j++) {
            if (j > 0) { variables += ", "; }
            variables += state.Variables[j].Name + "=" + state.Variables[j].Value;
        }

        const renderOptions: vscode.DecorationRenderOptions = {
            after: {
                contentText: variables,
            },
        };

        return {
            range: new vscode.Range(new vscode.Position(line, state.Column), new vscode.Position(line, Number.MAX_VALUE)),
            renderOptions,
        };
    }
}

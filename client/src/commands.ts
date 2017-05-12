"use strict";
import {TextEditorEdit, window} from "vscode";
import {
    LanguageClient, TextEdit
} from "vscode-languageclient";

export function handlerApplyTextEdits(client: LanguageClient): (uri: string, documentVersion: number,
                                        edits: TextEdit[]) => void {
    return function applyTextEdits(uri: string, documentVersion: number, edits: TextEdit[]) {

        const textEditor = window.activeTextEditor;
        if (textEditor && textEditor.document.uri.toString() === uri) {
            if (textEditor.document.version !== documentVersion) {
                console.log("Versions of doc are different");
            }
            textEditor.edit((mutator: TextEditorEdit)  => {
                for (const edit of edits) {
                    mutator.replace(client.protocol2CodeConverter.asRange(edit.range), edit.newText);
                }
            }).then((success) => {
                if (!success) {
                    window.showErrorMessage("Failed to apply changes to the document.");
                }
            });
        }
    };
}

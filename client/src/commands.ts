"use strict";
import { Position, Range, TextEditorEdit, window} from "vscode";
import {
    LanguageClient, TextEdit
} from "vscode-languageclient";
import { cloneRange } from "./serverHelper/dataConversions";

export function handlerApplyTextEdits(client: LanguageClient): (uri: string, documentVersion: number,
                                        edits: TextEdit[], diagPosition: Range, insertBefore: string) => void {
    return function applyTextEdits(uri: string, documentVersion: number, edits: TextEdit[], diagPosition: Range, insertBefore: string) {
        const revisedEdits = updateEditsWithActualLocations(edits, diagPosition, insertBefore);

        const textEditor = window.activeTextEditor;
        if (textEditor && textEditor.document.uri.toString() === uri) {
            if (textEditor.document.version !== documentVersion) {
                console.log("Versions of doc are different");
            }
            textEditor.edit((mutator: TextEditorEdit)  => {
                for (const edit of revisedEdits) {
                    mutator.replace(client.protocol2CodeConverter.asRange(edit.range), edit.newText);
                }
            }).then((success) => {
                if (!success) {
                    window.showErrorMessage("Failed to apply changes to the document.");
                }
            });
        }
    }
}

function updateEditsWithActualLocations(edits: TextEdit[], diagnosisPosition: Range, insertBefore: string): TextEdit[] {
     const insertionPosition = getInsertionPosition(insertBefore, diagnosisPosition);
     for(const edit of edits) {
         edit.range = new Range(insertionPosition, insertionPosition);
     }
     return edits;
}

function getInsertionPosition(insertBefore: string, startRange: Range): Position {
    const textEditor = window.activeTextEditor;
    let currentPosition = cloneRange(startRange);
    let currentText = textEditor.document.getText(currentPosition);
    while (currentText.trim().indexOf(insertBefore) < 0)  {
        const start = currentPosition.end;
        const end = start.translate(1);
        currentPosition = new Range(start, end);
        currentText = textEditor.document.getText(currentPosition);
    }
    const translation = currentPosition.start.character > 0 ? currentText.indexOf(insertBefore) - 1 : 0;
    return currentPosition.start.translate(0, translation);
}

"use strict";
import {EOL} from "os";
import * as vscode from "vscode-languageserver";
import { dafnyKeywords } from "./../languageDefinition/keywords";
import { isPositionInString } from "./../strings/stringUtils";
import { translate } from "./positionHelper";
import { ensureValidWordDefinition, getWordAtText, matchWordAtText } from "./wordHelper";
export class DocumentDecorator {

    protected _lines: string[];

    constructor(public document: vscode.TextDocument) {

        this._lines = document.getText().split(/\r\n|\r|\n/);
    }

    public getText(_range: vscode.Range): string {
        const range = this.validateRange(_range);

        if (range.start.line === range.end.line) {
            return this._lines[range.start.line].substring(range.start.character,
                range.end.character).trim();
        }

        const lineEnding = EOL;
        const startLineIndex = range.start.line;
        const endLineIndex = range.end.line;
        const resultLines: string[] = [];

        resultLines.push(this._lines[startLineIndex].substring(range.start.character).trim());
        for (let i = startLineIndex + 1; i < endLineIndex; i++) {
            resultLines.push(this._lines[i].trim());
        }
        resultLines.push(this._lines[endLineIndex].substring(0, range.end.character).trim());

        return resultLines.join(lineEnding).trim();
    }

    public lineAt(position: vscode.Position): string {

        let line: number;
        line = position.line;

        if (line < 0 || line >= this._lines.length) {
            throw new Error("Illegal value for `line` " + line);
        }

        return this._lines[line];
    }

    public validateRange(range: vscode.Range): vscode.Range {

        const start = this.validatePosition(range.start);
        const end = this.validatePosition(range.end);

        if (start === range.start && end === range.end) {
            return range;
        }
        return vscode.Range.create(start.line, start.character, end.line, end.character);
    }

    public validatePosition(position: vscode.Position): vscode.Position {

        let { line, character } = position;
        let hasChanged = false;

        if (line < 0) {
            line = 0;
            character = 0;
            hasChanged = true;
        } else if (line >= this._lines.length) {
            line = this._lines.length - 1;
            character = this._lines[line].length;
            hasChanged = true;
        } else {
            const maxCharacter = this._lines[line].length;
            if (character < 0) {
                character = 0;
                hasChanged = true;
            } else if (character > maxCharacter) {
                character = maxCharacter;
                hasChanged = true;
            }
        }

        if (!hasChanged) {
            return position;
        }
        return vscode.Position.create(line, character);
    }

    public findInsertPositionRange(_position: vscode.Position, insertBefore: string): vscode.Range {
        let currentLine = _position.line;
        let currentPosition = _position.character;
        while(currentLine > 0 && this._lines[currentLine].substr(0, currentPosition).lastIndexOf(insertBefore) < 0) {
            currentLine -= 1;
            currentPosition = this._lines[currentLine].length;
        }
        let positionOfInsertion =  this._lines[currentLine].substr(0, currentPosition).lastIndexOf(insertBefore);
        if(positionOfInsertion < 0) {
            positionOfInsertion = 0;
        }
        return vscode.Range.create(vscode.Position.create(currentLine, positionOfInsertion),
            vscode.Position.create(currentLine, positionOfInsertion +  insertBefore.length));

    }
    public matchWordRangeAtPosition(_position: vscode.Position, adjust: boolean = true): vscode.Range {
        const position = this.validatePosition(_position);
        const wordAtText = matchWordAtText(
            position.character + 1,
            this._lines[position.line],
            0
        );

        if (wordAtText) {
            let start = wordAtText.startColumn;
            let end = wordAtText.endColumn;
            if(adjust) {
                start -= 1;
                end -= 1;
            }
            return vscode.Range.create(position.line, start, position.line, end);
        }
        return undefined;
    }
    public getWordRangeAtPosition(_position: vscode.Position, regexp?: RegExp): vscode.Range {
        const position = this.validatePosition(_position);
        const wordAtText = getWordAtText(
            position.character + 1,
            ensureValidWordDefinition(regexp),
            this._lines[position.line],
            0
        );

        if (wordAtText) {
            return vscode.Range.create(position.line, wordAtText.startColumn - 1, position.line, wordAtText.endColumn - 1);
        }
        return undefined;
    }

    public isMethodCall(position: vscode.Position): boolean {
        const wordRange = this.getWordRangeAtPosition(position);
        if (!wordRange) {
            return false;
        }
        const wordRangeBeforeIdentifier = this.getWordRangeAtPosition(translate(wordRange.start, 0, -1));
        if (!wordRangeBeforeIdentifier) {
            return false;
        }
        const seperator = this.getText(vscode.Range.create(wordRangeBeforeIdentifier.end, wordRange.start));
        if (!seperator) {
            return false;
        }
        // matches if a point is between the identifer and the word before it -> its a method call
        const match = seperator.match(/\w*\.\w*/);
        return match && match.length > 0;
    }

    public getFullyQualifiedNameOfCalledMethod(position: vscode.Position): string {
        const wordRange = this.matchWordRangeAtPosition(position, false);
        const call = this.getText(wordRange);
        return call;
    }

    public getValidIdentifierOrNull(position: vscode.Position): string {
        const lineText = this.lineAt(position);
        const wordRange = this.getWordRangeAtPosition(position);
        const word = wordRange ? this.getText(wordRange) : "";
        if (!wordRange || lineText.startsWith("//") || isPositionInString(this.document, position)
            || word.match(/^\d+.?\d+$/) || dafnyKeywords.indexOf(word) > 0) {
            return null;
        }
        return word;
    }

    public getWordAtPosition(position: vscode.Position, adjust: boolean = true): string {
        const wordRange = this.matchWordRangeAtPosition(position, adjust);
        return wordRange ? this.getText(wordRange) : "";
    }
}

"use strict";
import {EOL} from "os";
import * as vscode from "vscode-languageserver";
import { dafnyKeywords } from "./../languageDefinition/keywords";
import { isPositionInString } from "./../strings/stringUtils";
import { DocumentIterator } from "./documentIterator";
import { translate } from "./positionHelper";
import { ensureValidWordDefinition, getWordAtText, matchWordAtText } from "./wordHelper";

export class DocumentDecorator {

    public documentLines: string[];
    private boogieCharOffset: number = 1;
    constructor(public document: vscode.TextDocument) {

        this.documentLines = document.getText().split(/\r\n|\r|\n/);
    }

    public getText(textRange: vscode.Range): string {
        const range = this.validateRange(textRange);

        if (range.start.line === range.end.line) {
            return this.documentLines[range.start.line].substring(range.start.character,
                range.end.character).trim();
        }

        const lineEnding = EOL;
        const startLineIndex = range.start.line;
        const endLineIndex = range.end.line;
        const resultLines: string[] = [];

        resultLines.push(this.documentLines[startLineIndex].substring(range.start.character).trim());
        for (let i = startLineIndex + 1; i < endLineIndex; i++) {
            resultLines.push(this.documentLines[i].trim());
        }
        resultLines.push(this.documentLines[endLineIndex].substring(0, range.end.character).trim());

        return resultLines.join(lineEnding).trim();
    }

    public lineAt(position: vscode.Position): string {

        let line: number;
        line = position.line;

        if (line < 0 || line >= this.documentLines.length) {
            throw new Error("Illegal value for `line` " + line);
        }

        return this.documentLines[line];
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
        } else if (line >= this.documentLines.length) {
            line = this.documentLines.length - 1;
            character = this.documentLines[line].length;
            hasChanged = true;
        } else {
            const maxCharacter = this.documentLines[line].length;
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

    public findInsertPositionRange(insertPosition: vscode.Position, insertBefore: string): vscode.Range {
        let currentLine = insertPosition.line;
        let currentPosition = insertPosition.character;
        while (currentLine > 0 && this.documentLines[currentLine].substr(0, currentPosition).lastIndexOf(insertBefore) < 0) {
            currentLine -= 1;
            currentPosition = this.documentLines[currentLine].length;
        }
        let positionOfInsertion =  this.documentLines[currentLine].substr(0, currentPosition).lastIndexOf(insertBefore);
        if (positionOfInsertion < 0) {
            positionOfInsertion = 0;
        }
        return vscode.Range.create(vscode.Position.create(currentLine, positionOfInsertion),
            vscode.Position.create(currentLine, positionOfInsertion +  insertBefore.length));

    }
    public readArrayExpression(arrayPosition: vscode.Position): vscode.Range | null {
        const position = this.validatePosition(arrayPosition);
        const iterator = new DocumentIterator(this, position);
        const exprStartChar = "[";
        const exprEndChar = "]";
        let openCount = 0;
        let closedCount = 0;
        let start: vscode.Position;
        iterator.skipToChar(exprStartChar);
        if (iterator.isValidPosition) {
            openCount = 1;
            start = vscode.Position.create(iterator.lineIndex, iterator.charIndex + 1);
        } else {
            console.warn("Could not read array, as the iterator start is an invalid position");
            return null;
        }
        while (openCount !== closedCount) {
            iterator.skipChar();
            if (!iterator.isValidPosition) {
                console.warn(`Could not read array, as the iterator position ${iterator} is at an invalid position`);
                return null;
            }
            if (iterator.currentChar === exprStartChar) {
                openCount++;
            }
            if (iterator.currentChar === exprEndChar) {
                closedCount++;
            }
            if (openCount === closedCount) {
                const end = vscode.Position.create(iterator.lineIndex, iterator.charIndex);
                return vscode.Range.create(start, end);
            }
        }
        console.warn("Could not read array, as the end is an unknown position");
        return null;
    }
    public matchWordRangeAtPosition(rangePosition: vscode.Position, adjust: boolean = true): vscode.Range | undefined {
        const position = this.validatePosition(rangePosition);
        const wordAtText = matchWordAtText(
            position.character + 1,
            this.documentLines[position.line],
            0,
        );

        if (wordAtText) {
            let start = wordAtText.startColumn;
            let end = wordAtText.endColumn;
            if (adjust) {
                start -= 1;
                end -= 1;
            }
            return vscode.Range.create(position.line, start, position.line, end);
        }
        return undefined;
    }
    public getWordRangeAtPosition(wordRangePosition: vscode.Position, regexp?: RegExp): vscode.Range | undefined {
        const position = this.validatePosition(wordRangePosition);
        const wordAtText = getWordAtText(
            position.character + 1,
            ensureValidWordDefinition(regexp),
            this.documentLines[position.line],
            0,
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
        return !!match && match.length > 0;
    }

    public getFullyQualifiedNameOfCalledMethod(position: vscode.Position): string | undefined {
        const wordRange = this.matchWordRangeAtPosition(position, false);
        if (wordRange === undefined) {
           return undefined;
        }
        const call = this.getText(wordRange);
        return call;
    }

    public getValidIdentifierOrNull(position: vscode.Position): string | null {
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

    public findBeginOfContractsOfMethod(beginPosition: vscode.Position): vscode.Position | null {
        const position = this.validatePosition(beginPosition);
        const iterator = new DocumentIterator(this, position);
        const paramsEndToken = ")";
        const paramsStartToken = "(";
        let openCount = 0;
        let closedCount = 0;
        iterator.skipToChar(paramsStartToken);
        if (!iterator.isValidPosition) {
            return null;
        }
        const start = vscode.Position.create(iterator.lineIndex, iterator.charIndex + 1 + this.boogieCharOffset);
        openCount = 1;
        while (openCount !== closedCount) {
            iterator.skipChar();
            if (!iterator.isValidPosition) {
                return start;
            }
            if (iterator.currentChar === paramsStartToken) {
                openCount++;
            }
            if (iterator.currentChar === paramsEndToken) {
                closedCount++;
            }
            if (openCount === closedCount) {
                // Skip return type
                const oldPos = vscode.Position.create(iterator.lineIndex, iterator.charIndex + 1 + this.boogieCharOffset);
                iterator.skipChar();
                iterator.skipWhiteSpace();
                if (!iterator.isValidPosition) {
                    return oldPos;
                }
                if (":".indexOf(iterator.currentChar) > -1) {
                    iterator.skipChar();
                    iterator.skipWhiteSpace();
                    iterator.skipWord();
                    if (iterator.isValidPosition) {
                        return vscode.Position.create(iterator.lineIndex, iterator.charIndex + 1 + this.boogieCharOffset);
                    }
                } else if (iterator.currentLine.substr(iterator.charIndex).startsWith("returns")) {
                    iterator.skipToChar(")");
                    if (iterator.isValidPosition) {
                        return vscode.Position.create(iterator.lineIndex, iterator.charIndex + 1 + this.boogieCharOffset);
                    }
                }
                return oldPos;
            }
        }
        return start;
    }

    public findInsertionPointOfContract(memberStart: vscode.Position, lastDependentDeclaration: vscode.Position | null = null): vscode.Position {
        const startOfTopLevelContracts = this.findBeginOfContractsOfMethod(memberStart);
        if (startOfTopLevelContracts === null) {
            throw new Error("Start of top level contracts could not be found");
        }
        if (!lastDependentDeclaration) {
            return startOfTopLevelContracts;
        }
        const iterator = new DocumentIterator(this, startOfTopLevelContracts || undefined); // TODO: Does it make sense to pass a undefined value here or just stop?
        while (iterator.isInfrontOf(lastDependentDeclaration)) {
            iterator.skipChar();
            iterator.skipToChar("{");
        }
        if (iterator.isValidPosition) {
            return vscode.Position.create(iterator.lineIndex, iterator.charIndex - 2);
        }
        return startOfTopLevelContracts;

    }

    public tryFindBeginOfBlock(beginPosition: vscode.Position): vscode.Position | null {
        const position = this.validatePosition(beginPosition);
        const blockStartToken = ")";
        const start: vscode.Position | null = null;
        const iterator = new DocumentIterator(this, position);
        iterator.moveBackToChar(blockStartToken);
        if (iterator.isValidPosition) {
            return vscode.Position.create(iterator.lineIndex, iterator.charIndex + 1);
        }
        return start; // TODO: This makes no sense, start is *always* null!
    }

    public parseArrayIdentifier(arrayPosition: vscode.Position): string {
        const position = this.validatePosition(arrayPosition);
        const iterator = new DocumentIterator(this, position);
        iterator.skipToChar("[");
        if (!iterator.isValidPosition) {
            return "";
        }
        const end = vscode.Position.create(iterator.lineIndex, iterator.charIndex);
        iterator.moveBack();
        iterator.skipWordBack();
        if (!iterator.isValidPosition) {
            return "";
        }
        const start = vscode.Position.create(iterator.lineIndex, iterator.charIndex + 1);
        return this.getText(vscode.Range.create(start, end));
    }
}

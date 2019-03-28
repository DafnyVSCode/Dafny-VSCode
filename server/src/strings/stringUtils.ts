"use strict";

import * as vscode from "vscode-languageserver";
import {DocumentDecorator} from "../vscodeFunctions/documentDecorator";

export function isPositionInString(document: vscode.TextDocument, position: vscode.Position): boolean {
    const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
    const lineText = documentDecorator.lineAt(position);
    const lineTillCurrentPosition = lineText.substr(0, position.character);

    // Count the number of double quotes in the line till current position. Ignore escaped double quotes
    let doubleQuotesCnt = (lineTillCurrentPosition.match(/[^\\]\"/g) || []).length;
    doubleQuotesCnt += lineTillCurrentPosition.startsWith('\"') ? 1 : 0;
    return doubleQuotesCnt % 2 === 1;
}

export function hashString(str: string) {
    let hash = 0;

    if (str.length === 0) {
        return hash;
    }
    for (let i = 0; i < str.length; i++) {
        const chr   = str.charCodeAt(i);
        // tslint:disable-next-line:no-bitwise
        hash  = ((hash << 5) - hash) + chr;
        // tslint:disable-next-line:no-bitwise
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function extractIdentifiers(expression: string): string[] {
    const identifiers: string[] = [];
    const identifiersRegex = /(\w+)/g;
    let match: RegExpExecArray | null;
    // tslint:disable-next-line:no-conditional-assignment
    while ((match = identifiersRegex.exec(expression)) !== null) {
        identifiers.push(match[0]);
    }
    return identifiers;
}

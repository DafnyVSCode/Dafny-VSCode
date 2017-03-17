import * as vscode from "vscode";
export function isPositionInString(document: vscode.TextDocument, position: vscode.Position): boolean {
    const lineText = document.lineAt(position.line).text;
    const lineTillCurrentPosition = lineText.substr(0, position.character);

	// Count the number of double quotes in the line till current position. Ignore escaped double quotes
    let doubleQuotesCnt = (lineTillCurrentPosition.match(/[^\\]\"/g) || []).length;
    doubleQuotesCnt += lineTillCurrentPosition.startsWith('\"') ? 1 : 0;
    return doubleQuotesCnt % 2 === 1;
}

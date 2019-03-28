import { Position } from "vscode-languageserver-types/lib/main";
import { DocumentDecorator } from "./../../../vscodeFunctions/documentDecorator";
export class ArrayInformation {
    public identifier: string;
    public indexExpression: string;
    constructor(documentDecorator: DocumentDecorator, startPosition: Position) {
        const arrayExprRange = documentDecorator.readArrayExpression(startPosition);
        if (arrayExprRange === null) {
            throw new Error("Invalid Array Range during construction!");
        }
        this.indexExpression = documentDecorator.getText(arrayExprRange);
        this.identifier = documentDecorator.parseArrayIdentifier(Position.create(arrayExprRange.start.line, arrayExprRange.start.character));
    }
    public isValid(): boolean {
        return this.identifier !== "" && this.indexExpression !== "";
    }
}

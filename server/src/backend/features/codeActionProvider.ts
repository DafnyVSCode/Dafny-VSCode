import {CodeActionParams, Command, Diagnostic} from "vscode-languageserver";
import { Position, TextEdit, TextEditChange } from "vscode-languageserver-types/lib/main";
import { Commands, DafnyKeyWords, DafnyReports } from "./../../strings/stringRessources";
import { DocumentDecorator } from "./../../vscodeFunctions/documentDecorator";
import { containsRange } from "./../../vscodeFunctions/positionHelper";
import { rangesIntersect } from "./../../vscodeFunctions/positionHelper";
import { translate } from "./../../vscodeFunctions/positionHelper";
import { containsPosition } from "./../../vscodeFunctions/positionHelper";
import { DafnyServer } from "./../dafnyServer";
import { SymbolType } from "./symbols";
import { Symbol } from "./symbols";
export class CodeActionProvider {

    private methodBlockStartSymbol: string = "{";
    private dummyPosition: Position = Position.create(0, 0);
    private dummyDocId: number = -1;
    private server: DafnyServer;
    public constructor(server: DafnyServer) {
        this.server = server;
    }
    public provideCodeAction(params: CodeActionParams): Thenable<Command[]> {
        const range = params.range;
        const doc = params.textDocument;
        return new Promise<Command[]>((resolve, reject) => {
            return resolve(params.context.diagnostics.map((e: Diagnostic) => {
               return this.getCodeActions(e, params);
            }).reduceRight((prev, next) => prev.then((a) => next.then((b) => a.concat(b))), Promise.resolve([])));
        });

    }

    private getGuardCommands(diagnostic: Diagnostic, params: CodeActionParams): Promise<Command[]> {
        const doc = this.server.symbolService.getTextDocument(params.textDocument.uri);
        if(!doc) {
            return Promise.resolve([]);
        }
        const documentDecorator: DocumentDecorator = new DocumentDecorator(doc);
        return this.server.symbolService.getAllSymbols(doc).then((symbols: Symbol[]) => {
            const commands: Command[] = [];
            const message = diagnostic.message;
            for(const guardKeyWord of DafnyKeyWords.GuardKeyWords) {
                if(message.indexOf(guardKeyWord) < 0 || message.startsWith(DafnyReports.UnresolvedDecreaseWarning)) {
                    continue;
                }
                const definingMethod = symbols.find((e: Symbol) => {
                    return (e.symbolType === SymbolType.Method || e.symbolType === SymbolType.Function)
                        && rangesIntersect(e.range, diagnostic.range);
                });
                const guardedExpression = this.parseGuardedExpression(message, guardKeyWord);
                let insertPosition: Position = this.dummyPosition;
                if(definingMethod) {
                    const lastDeclaration = this.findLastDeclaration(guardedExpression, symbols, definingMethod);
                    insertPosition = documentDecorator.findInsertionPointOfContract(definingMethod.start, diagnostic.range.start);
                }
                if(!insertPosition || insertPosition === this.dummyPosition) {
                    insertPosition = documentDecorator.tryFindBeginOfBlock(diagnostic.range.start);
                }
                if(insertPosition && insertPosition !== this.dummyPosition) {
                    const edit = TextEdit.insert(insertPosition, " " + guardKeyWord + " " + guardedExpression);
                    const command = Command.create(`Add ${guardKeyWord} guard`,
                        Commands.EditTextCommand, params.textDocument.uri,
                        this.dummyDocId, [edit]);
                    commands.push(command);
                }
            }
            return commands;
        });
    }

    private getNullCheckCommand(diagnostic: Diagnostic, params: CodeActionParams): Promise<Command[]> {
        const commands: Command[] = [];
        if(diagnostic.message.indexOf(DafnyReports.NullWarning) > -1) {
            const doc = this.server.symbolService.getTextDocument(params.textDocument.uri);
            if(!doc) {
                return Promise.resolve([]);
            }
            const documentDecorator: DocumentDecorator = new DocumentDecorator(doc);
            const expression = this.parseExpressionWhichMayBeNull(documentDecorator, diagnostic.range.start);
            const designator = this.removeMemberAcces(expression);
            if(designator !== "") {
                return this.server.symbolService.getAllSymbols(doc).then((symbols: Symbol[]) => {
                    const definingMethod = symbols.find((e: Symbol) => {
                        return (e.symbolType === SymbolType.Method || e.symbolType === SymbolType.Function)
                            && containsPosition(e.range, diagnostic.range.start);
                        });
                    let insertPosition: Position = this.dummyPosition;
                    if(definingMethod) {
                        insertPosition = documentDecorator.findBeginOfContractsOfMethod(definingMethod.start);
                    }
                    if(!insertPosition || insertPosition === this.dummyPosition) {
                        insertPosition = documentDecorator.tryFindBeginOfBlock(diagnostic.range.start);
                    }
                    if(insertPosition && insertPosition !== this.dummyPosition) {
                         const edit = TextEdit.insert(insertPosition, " requires " + designator + " != null");
                         commands.push(Command.create("Add null check",
                            Commands.EditTextCommand, params.textDocument.uri,
                            this.dummyDocId, [edit]));
                    }
                    return commands;
                });
            } else {
                return Promise.resolve(commands);
            }
        } else {
            return Promise.resolve(commands);
        }
    }

    private getIndexCheckCommand(diagnostic: Diagnostic, params: CodeActionParams): Promise<Command[]> {
        const commands: Command[] = [];
        if(diagnostic.message === DafnyReports.IndexBounding) {
            const doc = this.server.symbolService.getTextDocument(params.textDocument.uri);
            if(!doc) {
                return Promise.resolve([]);
            }
            const documentDecorator: DocumentDecorator = new DocumentDecorator(doc);
            const arrayExprRange = documentDecorator.readArrayExpression(diagnostic.range.start);
            const arrExpr = documentDecorator.getText(arrayExprRange);
            const arrIdText = documentDecorator.parseArrayIdentifier(Position.create(arrayExprRange.start.line,
                arrayExprRange.start.character));
            if(arrExpr !== "" && arrIdText !== "") {
                return this.server.symbolService.getAllSymbols(doc).then((symbols: Symbol[]) => {
                    const definingMethod = symbols.find((e: Symbol) => {
                        return (e.symbolType === SymbolType.Method || e.symbolType === SymbolType.Function)
                            && containsPosition(e.range, diagnostic.range.start);
                        });
                    let insertPosition: Position = this.dummyPosition;
                    if(definingMethod) {
                        const lastDeclaration = this.findLastDeclaration(arrExpr, symbols, definingMethod);
                        insertPosition = documentDecorator.findInsertionPointOfContract(definingMethod.start, diagnostic.range.start);
                    }
                    if(!insertPosition || insertPosition === this.dummyPosition) {
                        insertPosition = documentDecorator.tryFindBeginOfBlock(diagnostic.range.start);
                    }
                    if(insertPosition && insertPosition !== this.dummyPosition) {
                         if(definingMethod && insertPosition !== documentDecorator.findBeginOfContractsOfMethod(definingMethod.start)) {
                            const edit = TextEdit.insert(insertPosition, " invariant 0 <= " + arrExpr + " < " + arrIdText + ".Length");
                            commands.push(Command.create("Add invariant",
                                Commands.EditTextCommand, params.textDocument.uri,
                                this.dummyDocId, [edit]));
                         } else {
                            const editLower = TextEdit.insert(insertPosition, " requires " + arrExpr + " >= 0\n");
                            const editHigher = TextEdit.insert(insertPosition, " requires " + arrExpr + " < " + arrIdText + ".Length");
                            commands.push(Command.create("Add bound check",
                                Commands.EditTextCommand, params.textDocument.uri,
                                this.dummyDocId, [editLower, editHigher]));
                         }
                        }
                    return commands;
                });
            } else {
                return Promise.resolve(commands);
            }
        } else {
            return Promise.resolve(commands);
        }
    }

    private removeMemberAcces(designator: string): string {
        if(designator.lastIndexOf(".") > 0) {
            designator = designator.substr(0, designator.lastIndexOf("."));
        }
        return designator;
    }
    private parseExpressionWhichMayBeNull(documentDecorator: DocumentDecorator, diagnosisStart: Position): string {
        const wordRangeBeforeIdentifier = documentDecorator.matchWordRangeAtPosition(diagnosisStart, false);
        return documentDecorator.getText(wordRangeBeforeIdentifier);
    }

    private parseGuardedExpression(message: string, guardKeyword: string) {
        const lastIndexOfGuardKeyword = message.lastIndexOf(guardKeyword);
        return message.substr(lastIndexOfGuardKeyword + guardKeyword.length);
    }

    private getCodeActions(diagnostic: Diagnostic, params: CodeActionParams): Promise<Command[]> {
        let commands: Command[] = [];
        return this.getGuardCommands(diagnostic, params).then((guardCommands: Command[]) => {
            commands = commands.concat(guardCommands);
            return this.getNullCheckCommand(diagnostic, params).then((nullComands: Command[]) => {
                commands = commands.concat(nullComands);
                return this.getIndexCheckCommand(diagnostic, params).then((indCommands: Command[]) => {
                    return commands.concat(indCommands);
                });
            });
        });
    }

    private extractIdentifiers(expression: string): string[] {
        const identifiers: string[] = [];
        const identifiersRegex = /(\w+)/g;
        let match: RegExpExecArray;
        while ((match = identifiersRegex.exec(expression)) !== null) {
            identifiers.push(match[0]);
        }
        return identifiers;
    }

    private findLastDeclaration(expression: string, symbols: Symbol[], definingMethod: Symbol): Position {
        const identifiers = this.extractIdentifiers(expression);
        if(!identifiers) {
            return null;
        }
        const declarationsOfIdentifiers = symbols.filter((e: Symbol) => {
            return (e.symbolType === SymbolType.Definition && rangesIntersect(e.range, definingMethod.range)
                && identifiers.indexOf(e.name) >= 0);
        });
        if(!declarationsOfIdentifiers || declarationsOfIdentifiers.length === 0) {
            return null;
        }
        const lastDeclaration = declarationsOfIdentifiers.reduce((max, x) => {
            return x.line >= max.line && x.column > max.column ? x : max;
        });
        if(lastDeclaration) {
            return lastDeclaration.start;
        }
        return null;
    }
}

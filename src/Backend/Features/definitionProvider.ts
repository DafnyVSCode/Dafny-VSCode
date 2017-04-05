import * as vscode from "vscode";
import {DafnyServer} from "../dafnyServer";
import { dafnyKeywords } from "./../../LanguageDefinition/keywords";
import { EnvironmentConfig } from "./../../Strings/stringRessources";
import { isPositionInString } from "./../../Strings/StringUtils";
import { Symbol, SymbolTable } from "./symbols";

export const DAFNYMODE: vscode.DocumentFilter = { language: EnvironmentConfig.Dafny, scheme: "file" };
export class DafnyDefinitionInformtation {
    public filePath: string;
    public symbol: Symbol;
    constructor(symbol: Symbol, filePath: string) {
         this.symbol = symbol;
         this.filePath = filePath;
    }
}

export class DafnyDefinitionProvider implements vscode.DefinitionProvider {

    public constructor(public server: DafnyServer) {}

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position):
    Thenable<vscode.Location> {
        return this.provideDefinitionInternal(document, position).then((definitionInfo: DafnyDefinitionInformtation) => {
            if (definitionInfo == null || definitionInfo.filePath == null) {
                return null;
            }
            const definitionResource = vscode.Uri.file(definitionInfo.filePath);
            return new vscode.Location(definitionResource, definitionInfo.symbol.start);
        }, (err) => {
            console.error(err);
            return null;
        });
    }

    public provideDefinitionInternal(
        document: vscode.TextDocument, position: vscode.Position): Promise<DafnyDefinitionInformtation> {
            const wordRange = document.getWordRangeAtPosition(position);
            const lineText = document.lineAt(position.line).text;
            const word = wordRange ? document.getText(wordRange) : "";
            if (!wordRange || lineText.startsWith("//") || isPositionInString(document, position)
                || word.match(/^\d+.?\d+$/) || dafnyKeywords.indexOf(word) > 0) {
                return null;
            }
            return this.findDefinition(document, word);
    }

    private findDefinition(document: vscode.TextDocument, symbolName: string): Promise<DafnyDefinitionInformtation> {
        return this.server.symbolService.getSymbols(document).then((symbolTable: SymbolTable) => {
            let found = false;
            for(const symb of symbolTable.symbols) {
                if(symb.name === symbolName) {
                    found = true;
                    return new DafnyDefinitionInformtation(symb, document.fileName);
                }
            }
            return null;
        }).catch((err: any) => err);
    }
}

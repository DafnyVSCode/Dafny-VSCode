import * as cp from "child_process";
import * as vscode from "vscode";
import { dafnyKeywords } from "./../LanguageDefinition/keywords";
import { ProcessWrapper } from "./../Process/process";
import { Verification } from "./../Strings/regexRessources";
import { EncodeBase64 } from "./../Strings/stringEncoding";
import { DecodeBase64 } from "./../Strings/stringEncoding";
import { EnvironmentConfig } from "./../Strings/stringRessources";
import { isPositionInString } from "./../Strings/StringUtils";
import { Environment } from "./environment";

export const GO_MODE: vscode.DocumentFilter = { language: EnvironmentConfig.Dafny, scheme: "file" };
export class GoDefinitionInformtation {
    public file: string;
    public line: number;
    public column: number;
    public doc: string;
    public declarationlines: string[];
    public name: string;
    public toolUsed: string;
    public IsValid(): boolean {
        return this.column > 0 && this.file !== "" && this.line > 0 && this.name !== "";
    }
    constructor(dafnyDefResponse: any) {
         if(dafnyDefResponse.length && dafnyDefResponse.length > 0) {
            const firstMatch = dafnyDefResponse[0];
            if(firstMatch.SymbolInfos && firstMatch.SymbolInfos.length && firstMatch.SymbolInfos.length > 0) {
                const symbolInfo = firstMatch.SymbolInfos[0];
                this.column = symbolInfo.Column;
                this.declarationlines = firstMatch.Symbol;
                this.doc = firstMatch.Symbol;
                this.file = firstMatch.FilePath;
                this.line = symbolInfo.Line;
                this.name = firstMatch.Symbol;
                this.toolUsed = "DafnyDef";
            }
        }
    }
}

interface DefinitionTask {
    args: string[];
    baseDir: string;
    fileName: string;
    monoPath?: string;
    word: string;
}

export class GoDefinitionProvider implements vscode.DefinitionProvider {
    private serverProc: ProcessWrapper;
    private environment: Environment = new Environment();
    public provideDefinition(document: vscode.TextDocument, position: vscode.Position):
    Thenable<vscode.Location> {
        return this.provideDefinitionInternal(document, position).then((definitionInfo) => {
            if (definitionInfo == null || definitionInfo.file == null) {
                return Promise.resolve(null);
            }
            const definitionResource = vscode.Uri.file(definitionInfo.file);
            const pos = new vscode.Position(definitionInfo.line, definitionInfo.column);
            return new vscode.Location(definitionResource, pos);
        }, (err) => {
            if (err) {
                console.log(err);
            }
            return Promise.resolve(null);
        });
    }

    public provideDefinitionInternal(
        document: vscode.TextDocument, position: vscode.Position): Promise<GoDefinitionInformtation> {
            return new Promise<GoDefinitionInformtation>((resolve, reject) => {
                const wordRange = document.getWordRangeAtPosition(position);
                const lineText = document.lineAt(position.line).text;
                const word = wordRange ? document.getText(wordRange) : "";
                if (!wordRange || lineText.startsWith("//") || isPositionInString(document, position)
                    || word.match(/^\d+.?\d+$/) || dafnyKeywords.indexOf(word) > 0) {
                    return Promise.resolve(null);
                }
                return this.askDafnyDef(resolve, reject, document, word);
        });
    }

    private askDafnyDef(resolve: any, reject: any, document: any, symbol: any) {
        if(!this.serverIsAlive()) {
            const environment = new Environment();
            const command = environment.GetStartDafnyDefCommand();
            const options = environment.GetStandardSpawnOptions();
            const process = cp.spawn(command.command, command.args, options);
            this.serverProc = new ProcessWrapper(process,
                (err: Error) => { this.handleProcessError(err); },
                () => {this.handleProcessData((data) => {
                    if(!data) {
                        return reject(null);
                    }
                    return resolve(data);
                }); },
                () => { this.handleProcessExit(); },
                Verification.commandEndRegexDafnyDef
            );
        }

        const task: DefinitionTask = {
            args: [],
            baseDir: vscode.workspace.rootPath,
            fileName: document.fileName,
            word: symbol,
        };
        if(this.environment.usesMono) {
            task.monoPath = this.environment.GetMonoPath();
        }
        const encoded = EncodeBase64(task);
        this.serverProc.clearBuffer();
        this.serverProc.WriteDefinitionRequestToDafnyDef(encoded);
    }

    private handleProcessError(err: Error): void {
        vscode.window.showErrorMessage("DafnyDef process " + this.serverProc.pid + " error: " + err);
        console.error("dafny server stdout error:" + err.message);
    }

    private handleProcessData(callback: (data: any) => any): void {
        const log: string = this.serverProc.outBuf.substr(0, this.serverProc.positionCommandEnd());
        if(log && log.indexOf(EnvironmentConfig.DafnyDefSuccess) > 0 && log.indexOf(EnvironmentConfig.DafnyDefFailure) < 0) {
            const definitionInfo = this.parseResponse(log.substring(0, log.indexOf(EnvironmentConfig.DafnyDefSuccess)));
            if(definitionInfo.IsValid()) {
                callback(definitionInfo);
            } else {
                callback(null);
            }
        }
        console.log(log);
        this.serverProc.clearBuffer();
    }

    private parseResponse(response: string): GoDefinitionInformtation {
        const responseJson =  DecodeBase64(response);
        return new GoDefinitionInformtation(responseJson);
    }
    private handleProcessExit() {
        if(this.serverIsAlive()) {
            this.serverProc.killServerProc();
        }
        this.serverProc = null;
    }

    private serverIsAlive(): boolean {
        return this.serverProc && this.serverProc.isAlive();
    }
}

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
export interface GoDefinitionInformtation {
	file: string;
	line: number;
	column: number;
	doc: string;
	declarationlines: string[];
	name: string;
	toolUsed: string;
}

export class GoDefinitionProvider implements vscode.DefinitionProvider {
    private serverProc: ProcessWrapper;

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Location> {
		return this.provideDefinitionInternal(document, position, token).then(definitionInfo => {
			if (definitionInfo == null || definitionInfo.file == null) return null;
			let definitionResource = vscode.Uri.file(definitionInfo.file);
			let pos = new vscode.Position(definitionInfo.line, definitionInfo.column);
			return new vscode.Location(definitionResource, pos);
		}, err => {
			if (err) {
				console.log(err);
			}
			return Promise.resolve(null);
		});
	}

    public provideDefinitionInternal(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Promise<GoDefinitionInformtation> {
            return new Promise<GoDefinitionInformtation>((resolve, reject) => {
                const b = token;
                const wordRange = document.getWordRangeAtPosition(position);
                const lineText = document.lineAt(position.line).text;
                const word = wordRange ? document.getText(wordRange) : "";
                if (!wordRange || lineText.startsWith("//") || isPositionInString(document, position)
                || word.match(/^\d+.?\d+$/) || dafnyKeywords.indexOf(word) > 0) {
                    return Promise.resolve(null);
                }
                console.log(b);
                return this.pas(resolve, reject, document, word);
    });
}
    private pas(resolve: any, reject: any, document: any, word: any) {
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
                () => { this.handleProcessExit(); }, Verification.commandEndRegexDafnyDef);
        const task: any = {
            args: [],
            filename: document.fileName,
            word: word,
            baseDir: vscode.workspace.rootPath
        };
        const encoded = EncodeBase64(task);
        this.serverProc.clearBuffer();
        this.serverProc.WriteDefinitionRequestToDafnyDef(encoded);
    }
    private handleProcessError(err: Error): void {
        vscode.window.showErrorMessage("DafnyDef process " + this.serverProc.pid + " error: " + err);
        console.error("dafny server stdout error:" + err.message);
    }

    private handleProcessData(callback: (data: any) => any): void {

            // parse output
        const log: string = this.serverProc.outBuf.substr(0, this.serverProc.positionCommandEnd());
        if(log !== "") {
            var x = this.parseResponse(log);
            let definitionInfo: any = {
                file: x[0].FilePath,
                line: x[0].SymbolInfos[0].Line,
                column: x[0].SymbolInfos[0].Column,
                toolUsed: "DafnyDef",
                declarationlines: x[0].Symbol,
                doc: x[0].Symbol,
                name: x[0].Symbol
            };
            callback(definitionInfo);
        }
        console.log(log);
        this.serverProc.clearBuffer();

    }
    private parseResponse(log: string) {
        return DecodeBase64(log);
    }
    private handleProcessExit() {
        this.serverProc = null;

    }
}

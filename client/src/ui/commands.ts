import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient";
import { DafnyClientProvider } from "../dafnyProvider";
import { DafnyRunner } from "../dafnyRunner";
import { ICompilerResult } from "../serverHelper/ICompilerResult";
import { CommandStrings, Config, EnvironmentConfig, ErrorMsg, InfoMsg, LanguageServerRequest } from "../stringRessources";

/**
 * VSCode UI Commands
 */
export default class Commands {

    public static showReferences(uri: any, position: any, locations: any) {
        function parsePosition(p: any): vscode.Position {
            return new vscode.Position(p.line, p.character);
        }
        function parseRange(r: any): vscode.Range {
            return new vscode.Range(parsePosition(r.start), parsePosition(r.end));
        }
        function parseLocation(l: any): vscode.Location {
            return new vscode.Location(parseUri(l.uri), parseRange(l.range));
        }
        function parseUri(u: any): vscode.Uri {
            return vscode.Uri.file(u);
        }

        const parsedUri = vscode.Uri.file(uri);
        const parsedPosition = parsePosition(position);
        const parsedLocations = [];
        for (const location of locations) {
            parsedLocations.push(parseLocation(location));
        }

        vscode.commands.executeCommand("editor.action.showReferences", parsedUri, parsedPosition, parsedLocations);
    }

    public extensionContext: vscode.ExtensionContext;
    public languageServer: LanguageClient;
    public provider: DafnyClientProvider;
    public runner: DafnyRunner;

    // tslint:disable: object-literal-sort-keys
    public commands = [
        {name: CommandStrings.ShowReferences, callback: Commands.showReferences, doNotDispose: true},
        {name: CommandStrings.RestartServer,  callback: () => this.restartServer()},
        {name: CommandStrings.InstallDafny,   callback: () => this.installDafny()},
        {name: CommandStrings.UninstallDafny, callback: () => this.uninstallDafny()},
        {
            name: CommandStrings.Compile,
            callback: () => {
                if (!vscode.window.activeTextEditor) {
                    return; // The window was closed before compilation was executed
                }
                return this.compile(vscode.window.activeTextEditor.document);
            },
        },
        {
            name: CommandStrings.CompileAndRun,
            callback: () => {
                if (!vscode.window.activeTextEditor) {
                    return; // The window was closed before compilation was executed
                }
                return this.compile(vscode.window.activeTextEditor.document, true);
            },
        },
        {
            name: CommandStrings.EditText,
            // tslint:disable-next-line:object-literal-sort-keys
            callback: (uri: string, version: number, edits: vscode.TextEdit[]) => this.applyTextEdits(uri, version, edits),
        },
    ];

    constructor(extensionContext: vscode.ExtensionContext, languageServer: LanguageClient, provider: DafnyClientProvider, runner: DafnyRunner) {
        this.languageServer = languageServer;
        this.provider = provider;
        this.runner = runner;
        this.extensionContext = extensionContext;
    }

    /**
     * Register commands listed in @var this.commands to vscode
     */
    public registerCommands() {
        for (const cmd of this.commands) {
            const disposable = vscode.commands.registerCommand(cmd.name, cmd.callback);

            if (cmd.doNotDispose) {
                continue;
            }
            this.extensionContext.subscriptions.push(disposable);
        }
    }

    public restartServer() {
        this.languageServer.sendRequest(LanguageServerRequest.Reset)
        .then(() => true, () => {
            vscode.window.showErrorMessage("Can't restart dafny");
        });
    }

    public installDafny() {
        this.provider.dafnyStatusbar.hideProgress();
        this.provider.dafnyStatusbar.hide();
        this.languageServer.sendRequest(LanguageServerRequest.Install).then((basePath) => {
            console.log("BasePath: " + basePath);
            const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EnvironmentConfig.Dafny);
            config.update(Config.DafnyBasePath, basePath, true).then(() => {
                vscode.window.showInformationMessage("Installation finished");
                this.provider.dafnyStatusbar.hideProgress();
            });
        }, (e) => {
            vscode.window.showErrorMessage("Installing error: " + e);
            this.provider.dafnyStatusbar.hideProgress();
        });
    }

    public uninstallDafny() {
        this.languageServer.sendRequest(LanguageServerRequest.Uninstall).then(() => {
            vscode.window.showInformationMessage("Uninstall complete");
            this.provider.dafnyStatusbar.hideProgress();
            this.provider.dafnyStatusbar.hide();
        }, (e) => {
            vscode.window.showErrorMessage("Can't uninstall dafny:" + e);
            this.provider.dafnyStatusbar.hideProgress();
            this.provider.dafnyStatusbar.hide();
        });
    }

    public compile(document: vscode.TextDocument | undefined, run: boolean = false): void {
        if (!document) {
            return; // Skip if user closed everything in the meantime
        }
        document.save();
        vscode.window.showInformationMessage(InfoMsg.CompilationStarted);

        this.languageServer.sendRequest<ICompilerResult>(LanguageServerRequest.Compile, document.uri)
        .then((result) => {
            vscode.window.showInformationMessage(InfoMsg.CompilationFinished);
            if (run && result.executable) {
                this.runner.run(document.fileName);
            } else if (run) {
                vscode.window.showErrorMessage(ErrorMsg.NoMainMethod);
            }
            return true;
        }, (error: any) => {
            vscode.window.showErrorMessage("Can't compile: " + error.message);
        });
    }

    public applyTextEdits(uri: string, documentVersion: number, edits: vscode.TextEdit[]) {
        const textEditor = vscode.window.activeTextEditor;

        if (textEditor && textEditor.document.uri.toString() === uri) {
            if (textEditor.document.version !== documentVersion) {
                console.log("Versions of doc are different");
            }
            textEditor.edit((mutator: vscode.TextEditorEdit)  => {
                for (const edit of edits) {
                    mutator.replace(this.languageServer.protocol2CodeConverter.asRange(edit.range), edit.newText);
                }
            }).then((success) => {
                if (!success) {
                    vscode.window.showErrorMessage("Failed to apply changes to the document.");
                }
            });
        }
    }
}

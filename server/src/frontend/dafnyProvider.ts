"use strict";
import { Disposable, TextDocument } from "vscode-languageserver";
import { Context } from "../backend/context";
import { DafnyCompiler } from "../backend/dafnyCompiler";
import { DafnyServer } from "../backend/dafnyServer";
import { DafnySettings } from "../backend/dafnySettings";
import { DafnyDefinitionProvider } from "../backend/features/definitionProvider";
import { DafnyReferencesCodeLensProvider } from "../backend/features/referenceCodeLensProvider";
import { NotificationService } from "../notificationService";
import { Config, EnvironmentConfig, LanguageServerNotification } from "../strings/stringRessources";
import { CodeActionProvider } from "./../backend/features/codeActionProvider";
import { DafnyCompletionProvider } from "./../backend/features/completionProvider";
import { DafnyRenameProvider } from "./../backend/features/renameProvider";
import { Statusbar } from "./dafnyStatusbar";

export class DafnyServerProvider {
    public referenceProvider: DafnyReferencesCodeLensProvider;
    public definitionProvider: DafnyDefinitionProvider;
    public renameProvider: DafnyRenameProvider;
    public codeActionProvider: CodeActionProvider;
    public completionProvider: DafnyCompletionProvider;
    public compiler: DafnyCompiler;

    private subscriptions: Disposable[];
    private dafnyStatusbar: Statusbar;
    private dafnyServer: DafnyServer;
    private context: Context;

    constructor(public notificationService: NotificationService, serverVersion: string, rootPath: string, settings: DafnySettings) {

        this.context = new Context(this.notificationService);
        this.context.serverversion = serverVersion;
        this.context.rootPath = rootPath;
        this.dafnyStatusbar = new Statusbar(this.notificationService);
        this.dafnyServer = new DafnyServer(this.notificationService, this.dafnyStatusbar, this.context, settings);

        this.referenceProvider = new DafnyReferencesCodeLensProvider(this.dafnyServer);
        this.definitionProvider = new DafnyDefinitionProvider(this.dafnyServer);
        this.renameProvider = new DafnyRenameProvider(this.dafnyServer);
        this.codeActionProvider = new CodeActionProvider();
        this.completionProvider = new DafnyCompletionProvider(this.dafnyServer);
        this.compiler = new DafnyCompiler(this.notificationService, this.context, settings);
    }

    public dispose(): void {
        if (this.subscriptions && this.subscriptions.length > 0) {
            for (let i: number = 0; i < this.subscriptions.length; i++) {
                this.subscriptions[i].dispose();
            }
        }
    }

    public resetServer(): void {
        this.dafnyServer.setInactive();
        this.dafnyServer.reset();
        // this.doVerify(vscode.window.activeTextEditor.document);
    }

    public stop(): void {
        this.dafnyServer.stop();
    }

    public init(): void {
        this.dafnyServer.init();
    }

    public doVerify(textDocument: TextDocument): void {
        if (textDocument !== null && textDocument.languageId === EnvironmentConfig.Dafny) {
            this.dafnyServer.addDocument(textDocument, "verify");
        }
    }
}

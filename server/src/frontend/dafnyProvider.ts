"use strict";
import { CodeActionProvider } from "./../backend/features/codeActionProvider";

import * as vscode from "vscode-languageserver";
import {Context} from "../backend/context";
import {DafnyServer} from "../backend/dafnyServer";
import {DafnySettings} from "../backend/dafnySettings";
import { DafnyDefinitionProvider } from "../backend/features/definitionProvider";
import {DafnyReferencesCodeLensProvider} from "../backend/features/referenceCodeLensProvider";
import {Config,  EnvironmentConfig, LanguageServerNotification } from "../strings/stringRessources";
import { DafnyRenameProvider } from "./../backend/features/renameProvider";
import {Statusbar} from "./dafnyStatusbar";
export class DafnyServerProvider {

    public referenceProvider: DafnyReferencesCodeLensProvider;
    public definitionProvider: DafnyDefinitionProvider;
    public renameProvider: DafnyRenameProvider;
    public codeActionProvider: CodeActionProvider;
    private subscriptions: vscode.Disposable[];
    private dafnyStatusbar: Statusbar;
    private dafnyServer: DafnyServer;
    private context: Context;

    constructor(public connection: vscode.IConnection, serverVersion: string, rootPath: string, settings: DafnySettings) {

        this.context = new Context(connection);
        this.context.serverversion = serverVersion;
        this.context.rootPath = rootPath;
        this.dafnyStatusbar = new Statusbar(this.connection);
        this.dafnyServer = new DafnyServer(this.connection, this.dafnyStatusbar, this.context, settings);

        this.referenceProvider = new DafnyReferencesCodeLensProvider(this.dafnyServer);
        this.definitionProvider = new DafnyDefinitionProvider(this.dafnyServer);
        this.renameProvider = new DafnyRenameProvider(this.dafnyServer);
        this.codeActionProvider = new CodeActionProvider();
    }

    public dispose(): void {
        if(this.subscriptions && this.subscriptions.length > 0) {
            for(let i: number = 0; i < this.subscriptions.length; i++) {
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

    public doVerify(textDocument: vscode.TextDocument): void {
        if (textDocument !== null && textDocument.languageId === EnvironmentConfig.Dafny) {
            this.dafnyServer.addDocument(textDocument, "verify");
        }
    }
}
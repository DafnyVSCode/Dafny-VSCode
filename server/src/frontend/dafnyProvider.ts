"use strict";

import * as vscode from "vscode-languageserver";
import {Context} from "../backend/context";
import {DafnyServer} from "../backend/dafnyServer";
//import { DAFNYMODE } from "../backend/features/definitionProvider";
//import { DafnyDefinitionProvider } from "../backend/features/definitionProvider";
//import { DafnyReferencesCodeLensProvider } from "../backend/features/referenceCodeLensProvider";
import {Config,  EnvironmentConfig, LanguageServerNotification } from "../strings/stringRessources";
import {Statusbar} from "./dafnyStatusbar";
import{DafnySettings} from "../backend/dafnySettings";

export class DafnyServerProvider {
    //private diagCol: vscode.DiagnosticCollection = null;

    private subscriptions: vscode.Disposable[];
    private dafnyStatusbar: Statusbar;
    private dafnyServer: DafnyServer;
    private context: Context;

    constructor(public connection: vscode.IConnection, serverVersion: string, rootPath: string, settings: DafnySettings) {
        //this.diagCol = vscode.languages.createDiagnosticCollection(EnvironmentConfig.Dafny);

        this.context = new Context();
        this.context.serverversion = serverVersion;
        this.context.rootPath = rootPath;
        this.dafnyStatusbar = new Statusbar(this.connection);
        this.dafnyServer = new DafnyServer(this.connection, this.dafnyStatusbar, this.context, settings);
    }

    public dispose(): void {
        //this.dafnyStatusbar.hide();
        //this.diagCol.clear();
        //this.diagCol.dispose();
        if(this.subscriptions && this.subscriptions.length > 0) {
            for(let i: number = 0; i < this.subscriptions.length; i++) {
                this.subscriptions[i].dispose();
            }
        }
    }

    public resetServer(): void {
        this.dafnyServer.setInactive();
        this.dafnyServer.reset();
        //this.doVerify(vscode.window.activeTextEditor.document);
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

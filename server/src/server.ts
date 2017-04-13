"use strict";

import {
    CodeLens, CodeLensParams, CompletionItem, CompletionItemKind,
    createConnection, DefinitionRequest, Diagnostic, DiagnosticSeverity,
    IConnection, InitializeParams, InitializeResult, IPCMessageReader,
    IPCMessageWriter, Location, RenameParams, RequestHandler,
    TextDocument, TextDocumentItem, TextDocumentPositionParams, TextDocuments, TextDocumentSyncKind, WorkspaceEdit
} from "vscode-languageserver";

import { DafnySettings } from "./backend/dafnySettings";
import { DependencyVerifier } from "./backend/dependencyVerifier";
import { DafnyServerProvider } from "./frontend/dafnyProvider";
import { Answer, ErrorMsg, InfoMsg } from "./strings/stringRessources";
import { Commands, LanguageServerNotification, LanguageServerRequest } from "./strings/stringRessources";

const connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
const documents: TextDocuments = new TextDocuments();
let settings: Settings = null;
let started: boolean = false;
documents.listen(connection);

let workspaceRoot: string;
let provider: DafnyServerProvider = null;

connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;
    return {
        capabilities: {
            codeLensProvider: { resolveProvider: true },
            definitionProvider: true,
            renameProvider: true,
            textDocumentSync: documents.syncKind
        }
    };
});

function verifyDependencies() {
    const dependencyVerifier: DependencyVerifier = new DependencyVerifier();
    dependencyVerifier.verifyDafnyServer(workspaceRoot, connection, settings.dafny, (serverVersion: string) => {
        init(serverVersion);
    }, () => {
        connection.sendNotification(LanguageServerNotification.Error, ErrorMsg.DafnyCantBeStarted);
        connection.sendNotification(LanguageServerNotification.DafnyMissing, InfoMsg.AskInstallDafny);
    }, () => {
        connection.sendNotification(LanguageServerNotification.DafnyMissing, InfoMsg.DafnyUpdateAvailable);
    });
}

function init(serverVersion: string) {
    try {
        if (!provider) {
            provider = new DafnyServerProvider(connection, serverVersion, workspaceRoot, settings.dafny);
            provider.resetServer();
        } else {
            provider.init();
            provider.resetServer();
        }
    } catch (e) {
        connection.sendNotification(LanguageServerNotification.Error, "Exception occured: " + e);
    }
}

connection.onRenameRequest((handler: RenameParams): Thenable<WorkspaceEdit> => {
    if(provider && provider.renameProvider) {
        console.log("onRename: " + handler.textDocument.uri);
        return provider.renameProvider.provideRenameEdits(documents.get(handler.textDocument.uri), handler.position, handler.newName);
    } else {
        console.log("onRename: too early");
    }
});

connection.onDefinition((handler: TextDocumentPositionParams): Thenable<Location> => {
    if (provider && provider.definitionProvider) {
        console.log("onDefinition: " + handler.textDocument.uri);
        return provider.definitionProvider.provideDefinition(documents.get(handler.textDocument.uri), handler.position);
    } else {
        console.log("onDefinition: to early");
    }
});

connection.onCodeLens((handler: CodeLensParams): Promise<CodeLens[]> => {

    if (provider && provider.referenceProvider) {
        console.log("onCodeLens: " + handler.textDocument.uri);
        return provider.referenceProvider.provideCodeLenses(documents.get(handler.textDocument.uri));
    } else {
        console.log("onCodeLens: to early");
    }
});

connection.onCodeLensResolve((handler: CodeLens): Promise<CodeLens> => {

    if (provider && provider.referenceProvider && handler) {
        console.log("onCodeLensResolve: " + handler);
        return provider.referenceProvider.resolveCodeLens(handler);
    } else {
        console.log("onCodeLensResolve: to early");
    }
});

interface Settings {
    dafny: DafnySettings;
}

connection.onDidChangeConfiguration((change) => {
    settings = change.settings as Settings;
    if (!started) {
        started = true;
        verifyDependencies();
    }
});

connection.onRequest<void, void>(LanguageServerRequest.Stop, () => {
    if (provider) {
        provider.stop();
    }
    return;
});

connection.onRequest<void, void>(LanguageServerRequest.Reset, () => {
    if (provider) {
        provider.resetServer();
    }
    return;
});

connection.onNotification(LanguageServerNotification.Verify, (json: string) => {
    const textDocumentItem: TextDocumentItem = JSON.parse(json);
    const textDocument: TextDocument = TextDocument.create(textDocumentItem.uri, textDocumentItem.languageId,
        textDocumentItem.version, textDocumentItem.text);
    console.log(textDocument);
    if (provider) {
        provider.doVerify(textDocument);
    }
});

connection.listen();

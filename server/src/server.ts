"use strict";

import {
    CompletionItem, CompletionItemKind, createConnection,
    Diagnostic, DiagnosticSeverity, IConnection,
    InitializeParams, InitializeResult, IPCMessageReader, IPCMessageWriter,
    TextDocument, TextDocumentItem, TextDocumentPositionParams,
    TextDocuments, TextDocumentSyncKind
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
            textDocumentSync: documents.syncKind,
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

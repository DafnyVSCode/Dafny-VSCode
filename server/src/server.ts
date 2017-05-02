"use strict";

import {
    CodeActionParams, CodeLens, CodeLensParams,
    createConnection, IConnection, InitializeResult, IPCMessageReader,
    IPCMessageWriter, Location, RenameParams, TextDocument,
    TextDocumentItem, TextDocumentPositionParams, TextDocuments, TextDocumentSyncKind, WorkspaceEdit
} from "vscode-languageserver";
import Uri from "vscode-uri";
import { CompilerResult } from "./backend/dafnyCompiler";
import { DafnySettings } from "./backend/dafnySettings";
import { DependencyVerifier } from "./backend/dependencyVerifier";
import { CodeActionProvider } from "./backend/features/codeActionProvider";
import { ReferencesCodeLens } from "./backend/features/codeLenses";
import { DafnyServerProvider } from "./frontend/dafnyProvider";
import { NotificationService } from "./notificationService";
import { Answer, ErrorMsg, InfoMsg } from "./strings/stringRessources";
import { Commands, LanguageServerNotification, LanguageServerRequest } from "./strings/stringRessources";

const connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
const documents: TextDocuments = new TextDocuments();
const codeLenses: { [codeLens: string]: ReferencesCodeLens; } = {};
let settings: Settings = null;
let started: boolean = false;
let notificationService: NotificationService = null;
documents.listen(connection);

let workspaceRoot: string;
let provider: DafnyServerProvider = null;

connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;
    notificationService = new NotificationService(connection);
    return {
        capabilities: {
            codeActionProvider: true,
            codeLensProvider: { resolveProvider: true },
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ["."]
            },
            definitionProvider: true,
            renameProvider: true,
            textDocumentSync: documents.syncKind
        }
    };
});

function verifyDependencies() {
    const dependencyVerifier: DependencyVerifier = new DependencyVerifier();
    dependencyVerifier.verifyDafnyServer(workspaceRoot, notificationService, settings.dafny, (serverVersion: string) => {
        init(serverVersion);
    }, () => {
        connection.sendNotification(LanguageServerNotification.Error, ErrorMsg.DafnyCantBeStarted);
        connection.sendRequest(LanguageServerNotification.DafnyMissing, InfoMsg.AskInstallDafny).then(verifyDependencies,
            () => { console.log("still not working correctly"); });
    }, () => {
        connection.sendRequest(LanguageServerNotification.DafnyMissing, InfoMsg.DafnyUpdateAvailable).then(verifyDependencies,
            () => { console.log("update is not working"); });
    });
}

function init(serverVersion: string) {
    try {
        if (!provider) {
            provider = new DafnyServerProvider(notificationService, serverVersion, workspaceRoot, settings.dafny);
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
    if (provider && provider.renameProvider) {
        console.log("onRename: " + handler.textDocument.uri);
        return provider.renameProvider.provideRenameEdits(documents.get(handler.textDocument.uri), handler.position, handler.newName);
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

const MAX_RETRIES = 30;
function waitForServer(handler: CodeLensParams) {
    return new Promise(async (resolve, reject) => {
        let tries = 0;
        while (!(provider && provider.referenceProvider) && tries < MAX_RETRIES) {
            await sleep(2000);
            tries++;
        }
        if ((provider && provider.referenceProvider)) {
            resolve();
        } else {
            reject();
        }
    }).then(() => {
        const result = provider.referenceProvider.provideCodeLenses(documents.get(handler.textDocument.uri));
        result.then((lenses: ReferencesCodeLens[]) => {
            lenses.forEach((lens: ReferencesCodeLens) => {
                console.log("added codelens" + JSON.stringify(getCodeLens(lens)));
                codeLenses[JSON.stringify(getCodeLens(lens))] = lens;
            });
        });
        return result;
    });
}

function getCodeLens(referenceCodeLens: ReferencesCodeLens): CodeLens {
    return { command: referenceCodeLens.command, data: referenceCodeLens.data, range: referenceCodeLens.range };
}

function sleep(ms) {
    return new Promise((resolve: any) => setTimeout(resolve, ms));
}

connection.onCodeLens((handler: CodeLensParams): Promise<ReferencesCodeLens[]> => {

    if (provider && provider.referenceProvider) {
        console.log("onCodeLens: " + handler.textDocument.uri);
        const result = provider.referenceProvider.provideCodeLenses(documents.get(handler.textDocument.uri));
        result.then((lenses: ReferencesCodeLens[]) => {
            lenses.forEach((lens: ReferencesCodeLens) => {
                codeLenses[JSON.stringify(getCodeLens(lens))] = lens;
            });
        });
        return result;
    } else {
        console.log("onCodeLens: to early");
        return waitForServer(handler);
    }
});

connection.onCodeLensResolve((handler: CodeLens): Promise<CodeLens> => {

    if (provider && provider.referenceProvider) {
        const item = codeLenses[JSON.stringify(handler)];
        if (item !== null && item as ReferencesCodeLens) {
            return provider.referenceProvider.resolveCodeLens(item);
        } else {
            console.error("key not found ");
        }
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

connection.onDidCloseTextDocument((handler) => {
    connection.sendDiagnostics({ diagnostics: [], uri: handler.textDocument.uri });
});

connection.onRequest<CompilerResult, void>(LanguageServerRequest.Compile, (uri: Uri): Thenable<CompilerResult> => {
    if (provider && provider.compiler) {
        return provider.compiler.compile(uri);
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
    if (provider) {
        provider.doVerify(textDocument);
    }
});

connection.onCodeAction((params: CodeActionParams) => {
    if (provider && provider.codeActionProvider) {
        console.log("onCodeAction: " + params.textDocument.uri);
        return provider.codeActionProvider.provideCodeAction(params);
    }
});

connection.onCompletion((handler: TextDocumentPositionParams) => {
    if (provider && provider.completionProvider) {
        console.log("onComplection: " + handler.position);
        return provider.completionProvider.provideCompletion(handler);
    }
});

connection.listen();

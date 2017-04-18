"use strict";
import { CodeActionProvider } from "./backend/features/codeActionProvider";
import {
    CodeActionParams, CodeLens, CodeLensParams, CompletionItem, CompletionItemKind,
    createConnection, DefinitionRequest, Diagnostic, DiagnosticSeverity,
    IConnection, InitializeParams, InitializeResult, IPCMessageReader,
    IPCMessageWriter, Location, RenameParams, RequestHandler,
    TextDocument, TextDocumentItem, TextDocumentPositionParams, TextDocuments, TextDocumentSyncKind, WorkspaceEdit
} from "vscode-languageserver";
import { DafnySettings } from "./backend/dafnySettings";
import { DependencyVerifier } from "./backend/dependencyVerifier";
import { ReferencesCodeLens } from "./backend/features/codeLenses";
import { DafnyServerProvider } from "./frontend/dafnyProvider";
import { Answer, ErrorMsg, InfoMsg } from "./strings/stringRessources";
import { Commands, LanguageServerNotification, LanguageServerRequest } from "./strings/stringRessources";

const connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
const documents: TextDocuments = new TextDocuments();
const codeLenses: {
    [codeLens: string]: ReferencesCodeLens;
} = {};
let settings: Settings = null;
let started: boolean = false;
documents.listen(connection);

let workspaceRoot: string;
let provider: DafnyServerProvider = null;

connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;
    return {
        capabilities: {
            codeActionProvider : true,
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
    if (provider && provider.renameProvider) {
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

const MAX_RETRIES = 30;

function waitForServer(handler: CodeLensParams) {
    return new Promise(async (resolve, reject) => {
        let tries = 0;
        while (!(provider && provider.referenceProvider) && tries < MAX_RETRIES) {
            console.log("onCodeLens: to early: waiiting");
            await sleep(2000);
            tries++;
        }
        if ((provider && provider.referenceProvider)) {
            resolve();
        } else {
            reject();
        }
    }).then(() => {
        console.log("onCodeLens: to early: load the shiiiit");
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
                console.log("added codelens" + JSON.stringify(getCodeLens(lens)));
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
        console.log("onCodeLensResolve: ");
        const item = codeLenses[JSON.stringify(handler)];
        if (item !== null && item as ReferencesCodeLens) {
            return provider.referenceProvider.resolveCodeLens(item);
        } else {
            console.log("key not found ");
        }
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
    if (provider) {
        provider.doVerify(textDocument);
    }
});

connection.onCodeAction((params: CodeActionParams) => {
    if (provider && provider.codeActionProvider) {
        console.log("onCodeAction: " + params.textDocument.uri);
        return provider.codeActionProvider.provideCodeAction(params);
    } else {
        console.log("onCodeAction: to early");
    }
});

connection.listen();

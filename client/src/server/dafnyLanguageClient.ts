import * as path from "path";
import { ExtensionContext } from "vscode";
import { LanguageClient } from "vscode-languageclient";
import { TransportKind } from "vscode-languageclient/lib/client";

export default class DafnyLanguageClient extends LanguageClient {

    constructor(extensionContext: ExtensionContext) {
        const serverModule = extensionContext.asAbsolutePath(path.join("server", "server.js"));

        const serverOptions = {
            debug: {
                module: serverModule,
                options: {
                    execArgv: ["--nolazy", "--inspect=6009"],
                },
                transport: TransportKind.ipc,
            },
            run: {
                module: serverModule,
                transport: TransportKind.ipc,
            },
        };

        const clientOptions = {
            documentSelector: [{
                language: "dafny",
                scheme: "file",
            }],
            synchronize: {
                configurationSection: "dafny",
            },
        };

        super("dafny-vscode", "Dafny Language Server", serverOptions, clientOptions);
    }
}

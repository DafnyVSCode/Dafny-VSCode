"use strict";

import * as vscode from "vscode";
import { CodeLens, Location, Range, Uri } from "vscode";
import {DafnyServer} from "../dafnyServer";
import { decodeBase64 } from "./../../Strings/stringEncoding";
import { DafnyBaseCodeLensProvider } from "./baseCodeLensProvider";
import { ReferenceInformation, ReferencesCodeLens } from "./CodeLenses";
export class DafnyReferencesCodeLensProvider extends DafnyBaseCodeLensProvider {
    public constructor(server: DafnyServer) {
        super(server);
    }
    public provideReferenceInternal(codeLens: ReferencesCodeLens): Promise<ReferenceInformation[]> {
            return new Promise<ReferenceInformation[]>((resolve, reject) => {
                if(!codeLens.codeLensInfo) {
                    return resolve(null);
                }
                return this.askDafnyDefForReference(resolve, reject, codeLens.document, codeLens);
        });
    }

    public resolveCodeLens(inputCodeLens: CodeLens): Promise<CodeLens> {
        const codeLens = inputCodeLens as ReferencesCodeLens;

        return this.provideReferenceInternal(codeLens).then((referenceInfo: ReferenceInformation[]) => {
            if (referenceInfo === null || referenceInfo === undefined) {
                return Promise.resolve(null);
            }
            const locations: Location[] = [];
            for(const info of referenceInfo) {
                locations.push(new Location(Uri.file(info.file), new Range(info.position.line, info.position.character,
                info.position.line, info.position.character + info.methodName.length)));
            }
            codeLens.command = {
                arguments: [codeLens.document, codeLens.range.start, locations],
                command: "editor.action.showReferences",
                title: locations.length === 1
                    ? "1 reference"
                    : `${locations.length} references`,
        };
            return codeLens;
        }, (err) => {
            codeLens.command = {
                command: "",
                title: "Could not determine references" + err
            };
            return codeLens;
        });
    }

private askDafnyDefForReference(resolve: any, reject: any, document: vscode.TextDocument, codeLens: ReferencesCodeLens) {
    if(this.server.getSymbols(document.fileName)) {
        const symbols = this.server.getSymbols(document.fileName);
        console.log(symbols);
        const infos = this.parseReferenceResponseInternal(symbols,  document.fileName, codeLens);
        resolve(infos);
    } else {
    this.server.addDocument(document, "symbols", (log) =>  {
            console.log(log);

            if(log.indexOf("SYMBOLS_START ") > -1) {
                const info = log.substring("SYMBOLS_START ".length, log.indexOf(" SYMBOLS_END"));
                console.log(info);
                const infos = this.parseReferenceResponse(log, codeLens.document.fileName);
                resolve(infos);
            }
            resolve(null);
        }, () => {reject(null); });
    }

    }

    private parseReferenceResponse(response: string, file: string): ReferenceInformation[] {
        const responseJson =  decodeBase64(response);
        const references: ReferenceInformation[] = [];
        if(responseJson && responseJson.length && responseJson.length > 0) {
            for(const reference of responseJson) {
                references.push(new ReferenceInformation(reference, file));
            }
        }
        return references;
    }

    private parseReferenceResponseInternal(response: any, file: string, codeLens: ReferencesCodeLens): ReferenceInformation[] {
        const references: ReferenceInformation[] = [];
        if(response && response.length && response.length > 0) {
            for(const reference of response) {
                if(reference.References && reference.References.length && reference.References.length > 0) {
                    for(const r of reference.References) {
                        if(reference.Name === codeLens.codeLensInfo.symbol) {
                            references.push(new ReferenceInformation(r, file));
                        }
                    }
                }
            }
        }
        return references;
    }
}

"use strict";

import { CodeLens, Location, Range, Uri } from "vscode";
import {DafnyServer} from "../dafnyServer";
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
                return this.getReferences(resolve, reject, codeLens);
        });
    }

    public resolveCodeLens(inputCodeLens: CodeLens): Promise<CodeLens> {
        const codeLens = inputCodeLens as ReferencesCodeLens;

        return this.provideReferenceInternal(codeLens).then((referenceInfo: ReferenceInformation[]) => {
            if (!referenceInfo || referenceInfo === []) {
                codeLens.command = {
                    command: "",
                    title: "Could not determine references"
                };
                return Promise.resolve(codeLens);
            }
            const locations: Location[] = [];
            for(const info of referenceInfo) {
                locations.push(new Location(Uri.parse(info.file), new Range(info.position.line, info.position.character,
                info.position.line, info.position.character + info.methodName.length)));
            }
            codeLens.command = {
                arguments: [codeLens.document, codeLens.range.start, locations],
                command: "editor.action.showReferences",
                title: locations.length === 1
                    ? "1 reference"
                    : `${locations.length} references`,
        };
            return Promise.resolve(codeLens);
        }, (err) => {
            codeLens.command = {
                command: "",
                title: "Could not determine references" + err
            };
            return Promise.resolve(codeLens);
        });
    }

    private getReferences(resolve: any, reject: any, codeLens: ReferencesCodeLens) {
        this.server.symbolService.getSymbols(codeLens.document).then( (symbols: any) =>  {
            console.log(symbols);
            if(symbols) {
                const infos = this.parseReferenceResponse(symbols, codeLens);
                resolve(infos);
            } else {
                resolve(null);
            }
        }).catch(() => {reject(null); });
    }

    private parseReferenceResponse(symbols: any, codeLens: ReferencesCodeLens): ReferenceInformation[] {
        const references: ReferenceInformation[] = [];
        if(symbols && symbols.length && symbols.length > 0) {
            for(const reference of symbols) {
                if(reference.References && reference.References.length && reference.References.length > 0) {
                    for(const r of reference.References) {
                        if(reference.Name === codeLens.codeLensInfo.symbol) {
                            references.push(new ReferenceInformation(r, codeLens.document.fileName));
                        }
                    }
                }
            }
        }
        return references;
    }
}

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
            if (!referenceInfo) {
                return Promise.resolve(null);
            }
            return this.buildReferenceCodeLens(codeLens, referenceInfo);
        }, (err) => {
            codeLens.command = this.buildEmptyCommand();
            console.error(err);
            return codeLens;
        });
    }
    private buildReferenceCodeLens(codeLens: ReferencesCodeLens, referenceInformation: ReferenceInformation[]): any {
        const locations = this.buildReferenceLocations(referenceInformation);
        codeLens.command = {
            arguments: [Uri.file(codeLens.document.fileName), codeLens.range.start, locations],
            command: "editor.action.showReferences",
            title: locations.length === 1
                ? "1 reference"
                : `${locations.length} references`,
        };
        return codeLens;
    }
    private buildReferenceLocations(referenceInformation: ReferenceInformation[]): Location[] {
            const locations: Location[] = [];
            for(const info of referenceInformation) {
                locations.push(new Location(Uri.file(info.fileName), new Range(info.position.line, info.position.character,
                info.position.line, info.position.character + info.methodName.length)));
            }
            return locations;
    }

    private buildEmptyCommand(): any {
        return {
            command: "",
            title: "Could not dtermine references"
        };
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
        if(symbols) {
            for(const reference of symbols) {
                if(reference.References) {
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

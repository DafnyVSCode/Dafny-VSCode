"use strict";
import { SymbolTable } from "./symbols";

import { CodeLens, Location, Uri } from "vscode";
import {DafnyServer} from "../dafnyServer";
import { DafnyBaseCodeLensProvider } from "./baseCodeLensProvider";
import { ReferenceInformation, ReferencesCodeLens } from "./codeLenses";

export class DafnyReferencesCodeLensProvider extends DafnyBaseCodeLensProvider {
    public constructor(server: DafnyServer) {
        super(server);
    }
    public provideReferenceInternal(codeLens: ReferencesCodeLens): Promise<ReferenceInformation[]> {
        if(!codeLens.symbol) {
            return null;
        }
        return this.getReferences(codeLens);
    }

    public resolveCodeLens(inputCodeLens: CodeLens): Promise<CodeLens> {
        const codeLens = inputCodeLens as ReferencesCodeLens;
        return this.provideReferenceInternal(codeLens).then((referenceInfo: ReferenceInformation[]) => {
            if (!referenceInfo) {
                return null;
            }
            return this.buildReferenceCodeLens(codeLens, referenceInfo);
        }, (err) => {
            codeLens.command = this.buildEmptyCommand();
            console.error(err);
            return codeLens;
        });
    }
    private buildReferenceCodeLens(codeLens: ReferencesCodeLens, referenceInformation: ReferenceInformation[]): ReferencesCodeLens {
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
                locations.push(new Location(Uri.file(info.fileName), info.reference.range));
            }
            return locations;
    }

    private buildEmptyCommand(): any {
        return {
            command: "",
            title: "Could not determine references"
        };
    }
    private getReferences(codeLens: ReferencesCodeLens): Promise<ReferenceInformation[]> {
        return this.server.symbolService.getSymbols(codeLens.document).then( (tables: SymbolTable[]) =>  {
            if(tables) {
                const infos = this.parseReferenceResponse(tables, codeLens);
                return infos;
            } else {
                return null;
            }
        }).catch(() => null);
    }

    private parseReferenceResponse(symbolsTables: SymbolTable[], codeLens: ReferencesCodeLens): ReferenceInformation[] {
        const references: ReferenceInformation[] = [];
        for(const symbolTable of symbolsTables) {
            for(const symbol of symbolTable.symbols) {
                for(const reference of symbol.References) {
                    if(symbol.name === codeLens.symbol.name) {
                        references.push(new ReferenceInformation(reference, symbolTable.fileName));
                    }
                }
            }
        }
        return references;
    }
}

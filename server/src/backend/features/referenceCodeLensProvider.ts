"use strict";
import { SymbolTable } from "./symbols";

import { CodeLens, Location } from "vscode-languageserver";
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
        return Promise.resolve(this.getReferences(codeLens));
    }

    public resolveCodeLens(inputCodeLens: CodeLens): Promise<CodeLens> {
        console.log("We here");
        console.log(inputCodeLens);
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
            arguments: [codeLens.symbol.fileName, codeLens.range.start, locations],
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
                locations.push(Location.create(info.fileName, info.reference.range));
            }
            return locations;
    }

    private buildEmptyCommand(): any {
        return {
            command: "",
            title: "Could not determine references"
        };
    }
    private getReferences(codeLens: ReferencesCodeLens): PromiseLike<ReferenceInformation[]> {
         return workspace.openTextDocument(codeLens.symbol.fileName).then((doc: TextDocument) => {
            return this.server.symbolService.getSymbols(doc).then( (tables: SymbolTable[]) =>  {
            if(!tables) {
                const emptyRefs: ReferenceInformation[] = [];
                return emptyRefs;
            }
            return  this.parseReferenceResponse(tables, codeLens);

        }, (err) => {
            console.error(err);
            const emptyRefs: ReferenceInformation[] = [];
            return emptyRefs;
            });
        });
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

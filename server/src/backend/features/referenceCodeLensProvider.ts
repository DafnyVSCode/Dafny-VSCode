"use strict";
import { CodeLens, Location, Position, TextDocument } from "vscode-languageserver";
import Uri from "vscode-uri";
import { Commands } from "../../strings/stringRessources";
import { DafnyServer } from "../dafnyServer";
import { DafnyBaseCodeLensProvider } from "./baseCodeLensProvider";
import { ReferenceInformation, ReferencesCodeLens } from "./codeLenses";
import { SymbolTable } from "./symbols";

export class DafnyReferencesCodeLensProvider extends DafnyBaseCodeLensProvider {
    public constructor(server: DafnyServer) {
        super(server);
    }
    public provideReferenceInternal(codeLens: ReferencesCodeLens): Promise<ReferenceInformation[]> {
        if (!codeLens.symbol) {
            return null;
        }
        return Promise.resolve(this.getReferences(codeLens));
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
        const title = locations.length === 1
            ? "1 reference"
            : `${locations.length} references`;

        codeLens.command = {
            arguments: [Uri.parse(codeLens.symbol.document.uri), codeLens.range.start, locations],
            command: Commands.ShowReferences,
            title: locations.length === 1
                ? "1 reference"
                : `${locations.length} references`,
        };
        return codeLens;
    }
    private buildReferenceLocations(referenceInformation: ReferenceInformation[]): Location[] {
        const locations: Location[] = [];
        for (const info of referenceInformation) {
            locations.push(Location.create(info.fileName.fsPath, info.reference.range));
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
        return this.server.symbolService.getSymbols(codeLens.symbol.document).then((tables: SymbolTable[]) => {
            if (!tables) {
                const emptyRefs: ReferenceInformation[] = [];
                return emptyRefs;
            }
            return this.parseReferenceResponse(tables, codeLens);

        });
    }

    private parseReferenceResponse(symbolsTables: SymbolTable[], codeLens: ReferencesCodeLens): ReferenceInformation[] {
        const references: ReferenceInformation[] = [];
        for (const symbolTable of symbolsTables) {
            for (const symbol of symbolTable.symbols) {
                for (const reference of symbol.References) {
                    if (symbol.name === codeLens.symbol.name) {
                        references.push(new ReferenceInformation(reference, Uri.parse(symbolTable.fileName)));
                    }
                }
            }
        }
        return references;
    }
}

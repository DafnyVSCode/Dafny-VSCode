"use strict";
import { CodeLens, Location} from "vscode-languageserver";
import Uri from "vscode-uri";
import { Commands, ToolTipText } from "../../strings/stringRessources";
import { DafnyServer } from "../dafnyServer";
import { DafnyBaseCodeLensProvider } from "./baseCodeLensProvider";
import { ReferenceInformation, ReferencesCodeLens } from "./codeLenses";
import { Symbol, SymbolTable } from "./symbols";

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
            command: Commands.EmptyCommand,
            title: ToolTipText.NoReferences
        };
    }
    private getReferences(codeLens: ReferencesCodeLens): Promise<ReferenceInformation[]> {
        return this.server.symbolService.getAllSymbols(codeLens.symbol.document).then((symbols: Symbol[]) => {
            const references: ReferenceInformation[] = [];
            for (const symbol of symbols) {
                for (const reference of symbol.References) {
                    if (symbol.name === codeLens.symbol.name) {
                        references.push(new ReferenceInformation(reference, Uri.parse(symbol.document.uri)));
                    }
                }
            }
            return references;
        });
    }
}

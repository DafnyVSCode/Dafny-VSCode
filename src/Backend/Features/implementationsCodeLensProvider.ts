
"use strict";
import { CodeLens, Location, Range, Uri } from "vscode";
import { ReferencesCodeLens } from "./baseCodeLensProvider";
import { DafnyBaseCodeLensProvider } from "./baseCodeLensProvider";
import { DafnyDefinitionInformtation } from "./definitionProvider";
import { DafnyDefinitionProvider } from "./definitionProvider";
import { DafnyServer } from "../dafnyServer";
export class DafnyImplementationsCodeLensProvider extends DafnyBaseCodeLensProvider {
    
    constructor(server: DafnyServer, public definitionProvider: DafnyDefinitionProvider) {
        super(server);
    }

    public resolveCodeLens(inputCodeLens: CodeLens): Promise<CodeLens> {
        const codeLens = inputCodeLens as ReferencesCodeLens;
        return this.definitionProvider.provideDefinitionInternalDirectly(codeLens.text, codeLens.codeLensInfo.symbol)
        .then((defintion: DafnyDefinitionInformtation) => {
            if (!defintion) {
                throw codeLens;
            }
            const location = new Location(Uri.file(defintion.file), new Range(defintion.position.line,
                defintion.position.character, defintion.position.line, defintion.position.character + defintion.name.length));
            const locations = [location];
            codeLens.command = {
                arguments: [codeLens.document, codeLens.range.start, locations],
                command: "editor.action.showReferences",
                title: locations.length === 1
                    ? "1 implementation"
                    : `${locations.length} implementations`
            };
            return codeLens;
        }

        ).catch(() => {
            codeLens.command = {
                command: "",
                title: "Could not determine implementations"
            };
            return codeLens;
        });
    }
}

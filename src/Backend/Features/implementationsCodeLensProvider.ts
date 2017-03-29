
"use strict";
import { CodeLens, Location, Range, Uri } from "vscode";
import { ReferencesCodeLens } from "./baseCodeLensProvider";
import { DafnyBaseCodeLensProvider } from "./baseCodeLensProvider";
import { DafnyDefinitionInformtation } from "./definitionProvider";
import { DafnyDefinitionProvider } from "./definitionProvider";
export class DafnyImplementationsCodeLensProvider extends DafnyBaseCodeLensProvider {
    private definitionProvider = new DafnyDefinitionProvider();
    public resolveCodeLens(inputCodeLens: CodeLens): Promise<CodeLens> {
        const codeLens = inputCodeLens as ReferencesCodeLens;
        return this.definitionProvider.provideDefinitionInternalDirectly(codeLens.file, codeLens.symbol, true)
        .then((defintion: DafnyDefinitionInformtation) => {
            if (!defintion) {
                throw codeLens;
            }
            const location = new Location(Uri.file(defintion.file), new Range(defintion.line,
                defintion.column, defintion.line, defintion.column + defintion.name.length));
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

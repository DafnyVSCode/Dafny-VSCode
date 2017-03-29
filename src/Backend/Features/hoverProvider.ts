"use strict";

import { Hover, HoverProvider, Location, Position, TextDocument } from "vscode";
import { DafnyDefinitionProvider } from "./definitionProvider";

export class DafnyHoverProvider implements HoverProvider {
    private goDefinitionProvider = new DafnyDefinitionProvider();

    public provideHover(document: TextDocument, position: Position): Promise<Hover | undefined | null> {
        const filepath = document.fileName;
        if (!filepath) {
            return null;
        }
        return Promise.resolve(this.goDefinitionProvider.provideDefinition(document, position).then((location: Location) => {
            if(location) {
                    return new Hover(
                    [{ language: "dafny", value:
                    "Has yet to be implemted. There was no time, because we have to fight of giant bunnies" }], location.range);
            }else {
                return null;
            }
        }, () => null));
    }
}

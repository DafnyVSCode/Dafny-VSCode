/*"use strict";

import { Hover, HoverProvider, Location, Position, TextDocument } from "vscode-languageserver";

export class DafnyHoverProvider implements HoverProvider {

    public provideHover(document: TextDocument, position: Position): Promise<Hover | undefined | null> {
        const filepath = document.fileName;
        if (!filepath) {
            return null;
        }
        const i = position;
        return i == null ? null : null;
    }
}
*/
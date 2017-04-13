"use strict";

import { Hover, Location, Position, TextDocument } from "vscode-languageserver";

export class DafnyHoverProvider {

    public provideHover(document: TextDocument, position: Position): Promise<Hover | undefined | null> {
        const filepath = document.uri;
        if (!filepath) {
            return null;
        }
        const i = position;
        return i == null ? null : null;
    }
}

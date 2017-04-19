"use strict";

import { Position, Range } from "vscode-languageserver";

export function translate(position: Position, lineDeltaOrChange: number | { lineDelta?: number; characterDelta?: number; },
                          characterDelta: number = 0): Position {

    if (lineDeltaOrChange === null || characterDelta === null) {
        throw new Error("invalid params");
    }

    let lineDelta: number;
    if (typeof lineDeltaOrChange === "undefined") {
        lineDelta = 0;
    } else if (typeof lineDeltaOrChange === "number") {
        lineDelta = lineDeltaOrChange;
    } else {
        lineDelta = typeof lineDeltaOrChange.lineDelta === "number" ? lineDeltaOrChange.lineDelta : 0;
        characterDelta = typeof lineDeltaOrChange.characterDelta === "number" ? lineDeltaOrChange.characterDelta : 0;
    }

    if (lineDelta === 0 && characterDelta === 0) {
        return position;
    }
    return Position.create(position.line + lineDelta, position.character + characterDelta);
}

export function containsRange(range: Range, otherRange: Range): boolean {
    if (otherRange.start.line < range.start.line || otherRange.end.line < range.start.line) {
        return false;
    }
    if (otherRange.start.line > range.end.line || otherRange.end.line > range.end.line) {
        return false;
    }
    if (otherRange.start.line === range.start.line && otherRange.start.character < range.start.character) {
        return false;
    }
    if (otherRange.end.line === range.end.line && otherRange.end.character > range.end.character) {
        return false;
    }
    return true;
}

export function containsPosition(range: Range, position: Position): boolean {
    if (position.line < range.start.line || position.line > range.end.line) {
        return false;
    }
    if (position.line === range.start.line && position.character < range.start.character) {
        return false;
    }
    if (position.line === range.end.line && position.character > range.end.character) {
        return false;
    }
    return true;
}

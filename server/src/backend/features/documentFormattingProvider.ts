"use strict";

import { FormattingOptions, Hover, Location, Position, TextDocument, TextEdit, Range } from "vscode-languageserver";
import { DocumentDecorator } from "../../vscodeFunctions/documentfunctions";

export class DocumentFormattingProvider {

    public format(document: TextDocument, options: FormattingOptions):
        Thenable<TextEdit[]> {

        return new Promise<TextEdit[]>((resolve, reject) => {
            let textEdits: TextEdit[] = [];
            const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
            const text = document.getText();
            let currentIndention = 0;

            let lineNumber = 0;
            let lastLine = "";
            let startBracket = 0;
            let columnIndex = 0;
            let insertIndention = false;
            for (let i = 0; i < text.length; i++) {
                let currentLine = documentDecorator.lineAt(Position.create(lineNumber, 0));
                const c = text[i];
                columnIndex++;

                if (c === "}") {
                    currentIndention -= options.tabSize;
                } else if (c === "{") {
                    currentIndention += options.tabSize;
                }

                if (insertIndention /*|| c === "{" || c === "}"*/) {
                    const whitespaces = currentLine.match(/^\s*/)[0].length;
                    if (whitespaces < currentIndention) {
                        for (let t = 0; t < currentIndention - whitespaces && currentIndention > 0; t++) {
                            if (text[i + t + 1] !== " ") {
                                textEdits.push(TextEdit.insert(Position.create(lineNumber, columnIndex-1), " "));
                            }
                        }
                    } else if (whitespaces > currentIndention) {
                        for (let t = 0; t < whitespaces - currentIndention && currentIndention > 0; t++) {
                            if (text[i + t + 1] !== " ") {
                                //textEdits.push(TextEdit.del(Position.create(lineNumber, columnIndex), " "));
                            }
                        }
                    }
                    insertIndention = false;
                }

                if (c === "{") {
                    if (!text.substring(startBracket, i).includes("\n")) {
                        textEdits.push(TextEdit.insert(Position.create(lineNumber, columnIndex - 1), "\n"));
                    }
                    if (!text.substring(i, i + 3).includes("\n")) {
                        textEdits.push(TextEdit.insert(Position.create(lineNumber, columnIndex), "\n"));
                    }
                    startBracket = i;

                    for (let t = 0; t < currentIndention && currentIndention > 0; t++) {
                        if (text[i - t - 1] !== " " && text[i] !== "\n") {
                            textEdits.push(TextEdit.insert(Position.create(lineNumber, columnIndex - 1), " "));
                        }
                    }

                    currentIndention += options.tabSize;
                    insertIndention = true;
                } else if (c === "}") {
                    currentIndention -= options.tabSize;

                    if (!text.substring(startBracket, i).includes("\n")) {
                        textEdits.push(TextEdit.insert(Position.create(lineNumber, columnIndex - 1), "\n"));
                    }

                    /*for (let t = 0; t < currentIndention && currentIndention > 0; t++) {
                        if (text[i - t - 1] !== " " && text[i] !== "\n") {
                            textEdits.push(TextEdit.insert(Position.create(lineNumber, columnIndex - 1), " "));
                        }
                    }*/
                } else if (c === ";") {
                    if (!text.substring(i, i + 3).includes("\n")) {
                        textEdits.push(TextEdit.insert(Position.create(lineNumber, columnIndex), "\n"));
                    }
                    insertIndention = true;
                } else {

                    /*if (insertIndention) {
                        for (let t = 0; t < currentIndention && currentIndention > 0; t++) {
                            textEdits.push(TextEdit.insert(Position.create(lineNumber, columnIndex - 1), " "));
                        }
                        insertIndention = false;
                    }*/
                }


                lastLine = currentLine;

                if (c === "\n") {
                    lineNumber++;
                    startBracket = i;
                    columnIndex = 0;

                    /**/
                }

            }

            resolve(textEdits);
        });
    }
}
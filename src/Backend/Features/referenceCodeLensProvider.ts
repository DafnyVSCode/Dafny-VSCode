/*
'use strict';

import { CodeLens, CancellationToken, TextDocument, Range, Location } from 'vscode';
import * as Proto from '../protocol';
import * as PConst from '../protocol.const';

import { TypeScriptBaseCodeLensProvider, ReferencesCodeLens } from './baseCodeLensProvider';
import { ITypescriptServiceClient } from '../typescriptService';
import { DafnyBaseCodeLensProvider } from "./baseCodeLensProvider";

export class DafnyReferencesCodeLensProvider extends DafnyBaseCodeLensProvider {

    resolveCodeLens(inputCodeLens: CodeLens, token: CancellationToken): Promise<CodeLens> {
        const codeLens = inputCodeLens as ReferencesCodeLens;
        const args: Proto.FileLocationRequestArgs = {
            file: codeLens.file,
            line: codeLens.range.start.line + 1,
            offset: codeLens.range.start.character + 1
        };
        return this.client.execute('references', args, token).then((response: any) => {
            if (!response || !response.body) {
                throw codeLens;
            }

            const locations = response.body.refs
                .map((reference: any) =>
                    new Location(this.client.asUrl(reference.file),
                        new Range(
                            reference.start.line - 1, reference.start.offset - 1,
                            reference.end.line - 1, reference.end.offset - 1)))
                .filter((location: any) =>
					// Exclude original definition from references
                    !(location.uri.fsPath === codeLens.document.fsPath &&
                        location.range.start.isEqual(codeLens.range.start)));

            codeLens.command = {
                arguments: [codeLens.document, codeLens.range.start, locations],
                command: "editor.action.showReferences",
                title: locations.length === 1
                    ? "1 reference"
                    : `${locations.length} references`,
        };
            return codeLens;
        }).catch(() => {
            codeLens.command = {
                command: "",
                title: "Could not determine references"
            };
            return codeLens;
        });
    }

*/

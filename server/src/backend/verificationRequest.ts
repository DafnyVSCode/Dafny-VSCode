
"use strict";

import { TextDocument } from "vscode-languageserver";
import { EnvironmentConfig } from "../strings/stringRessources";
export class VerificationRequest {
    public srcEnds: number[];
    public timeCreated: number;
    public timeSent: number = 0;
    public timeFinished: number = 0;

    constructor(public source: string, public document: TextDocument, public verb: string,
                public callback?: ((data: any) => any), public error?: ((data: any) => any)) {
        this.timeCreated = Date.now();

        const lines: string[] = source.split(EnvironmentConfig.NewLine);
        this.srcEnds = new Array(lines.length);

        // tslint:disable-next-line:forin
        for (const index in lines) {
            const line: string = lines[index];
            this.srcEnds[index] = line.length;
        }
    }
}

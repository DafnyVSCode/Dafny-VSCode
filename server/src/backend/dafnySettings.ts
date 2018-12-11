"use strict";

export interface IDafnySettings {
    basePath: string;
    useMono: boolean;
    monoPath: string;
    automaticVerification: boolean;
    automaticVerificationDelayMS: number;
}

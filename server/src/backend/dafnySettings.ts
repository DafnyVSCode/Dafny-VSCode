"use strict";

export interface IDafnySettings {
    basePath: string;
    useMono: boolean;
    monoPath: string; // deprecated monoPath configuration option #40
    monoExecutable: string;
    automaticVerification: boolean;
    automaticVerificationDelayMS: number;
    serverVerifyArguments: string[];
}

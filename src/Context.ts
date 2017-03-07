
"use strict";

import {VerificationResults} from "./VerificationResults";
import {VerificationRequest} from "./VerificationRequest";


export class Context {

    public queuedRequests: { [docPathName: string]: VerificationRequest } = {};

    public verificationResults: VerificationResults = new VerificationResults();

    public activeRequest: VerificationRequest = null;

}
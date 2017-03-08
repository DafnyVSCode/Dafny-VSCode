
"use strict";

import * as Collections from "typescript-collections";
import {VerificationRequest} from "./VerificationRequest";
import {VerificationResults} from "./VerificationResults";

export class Context {
    public queue: Collections.Queue<VerificationRequest> = new Collections.Queue<VerificationRequest>();
    public verificationResults: VerificationResults = new VerificationResults();
    public activeRequest: VerificationRequest = null;
    public serverpid: number;
}


"use strict";

import {VerificationResults} from "./VerificationResults";
import {VerificationRequest} from "./VerificationRequest";
import * as Collections from "typescript-collections";

export class Context {

    public queue : Collections.Queue<VerificationRequest> = new Collections.Queue<VerificationRequest>();

    public verificationResults: VerificationResults = new VerificationResults();

    public activeRequest: VerificationRequest = null;

    public serverpid : number;

}
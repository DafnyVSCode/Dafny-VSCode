"use strict";

export enum VerificationStatus {
    Verified = 0,
    NotVerified = 1,
    Failed = 2,
}

export class VerificationResult {
    public verificationStatus: VerificationStatus;
    public proofObligations: number;
    public errorCount: number;
    public crashed: boolean = false;
    public counterModel: any;
}

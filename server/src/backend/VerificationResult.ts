import { IGeneralVerificationResult } from "./IGeneralVerificationResult";
import { VerificationStatus } from "./verificationResults";

export class VerificationResult implements IGeneralVerificationResult {
    public verificationStatus: VerificationStatus | undefined;
    public readonly crashed: boolean = false;

    constructor(public counterModel: any, public errorCount: number, public proofObligations: number) {
    }
}

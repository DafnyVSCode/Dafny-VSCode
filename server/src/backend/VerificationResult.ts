import { VerificationStatus } from "./verificationResults";
export class VerificationResult {
    public verificationStatus: VerificationStatus;
    public proofObligations: number;
    public errorCount: number;
    public crashed: boolean = false;
    public counterModel: any;
}

import { IGeneralVerificationResult } from "./IGeneralVerificationResult";

export class VerificationResultCrashed implements IGeneralVerificationResult {
    public crashed: boolean = true;
}

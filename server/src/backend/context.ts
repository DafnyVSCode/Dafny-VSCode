"use strict";
import * as Collections from "typescript-collections";
import { NotificationService } from "../notificationService";
import { VerificationRequest } from "./verificationRequest";
import { VerificationResult } from "./VerificationResult";
import { VerificationResults } from "./verificationResults";

export class Context {
    public queue: Collections.Queue<VerificationRequest> = new Collections.Queue<VerificationRequest>();
    public verificationResults: VerificationResults;
    public activeRequest: VerificationRequest = null;
    public serverpid: number;
    public rootPath: string;
    public serverversion: string;
    public symbolTable: { [fileName: string]: any } = {};

    constructor(public notificationService: NotificationService) {
        this.verificationResults = new VerificationResults(this.notificationService);
    }

    public clear(): void {
        this.queue.clear();
        this.activeRequest = null;
        this.serverpid = null;
    }

    public addSymbols(fileName: string, symbols: any) {
        this.symbolTable[fileName] = symbols;
    }

    public getSymbols(fileName: string): any {
        return this.symbolTable[fileName];
    }
    public enqueueRequest(request: VerificationRequest): void {
        this.queue.enqueue(request);
    }

    public collectRequest(serverReturn: string): VerificationResult {
        this.activeRequest.timeFinished = Date.now();
        const result = this.verificationResults.collect(serverReturn, this.activeRequest);
        return result;
    }

    public addCrashedRequest(request: VerificationRequest): void {
        this.verificationResults.addCrashed(request);
    }
}

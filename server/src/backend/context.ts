"use strict";
import * as Collections from "typescript-collections";
import { NotificationService } from "../notificationService";
import { VerificationRequest } from "./verificationRequest";
import { VerificationResult } from "./VerificationResult";
import { VerificationResults } from "./verificationResults";

export class Context {
    public queue: Collections.Queue<VerificationRequest> = new Collections.Queue<VerificationRequest>();
    public verificationResults: VerificationResults;
    public activeRequest: VerificationRequest | undefined;
    public serverpid: number | undefined;
    public symbolTable: { [fileName: string]: any } = {};

    constructor(public notificationService: NotificationService, public serverversion: string, public rootPath: string) {
        this.verificationResults = new VerificationResults(this.notificationService);
    }

    public clear(): void {
        this.queue.clear();
        this.activeRequest = undefined;
        this.serverpid = undefined;
    }

    public addSymbols(fileName: string, symbols: any) {
        this.symbolTable[fileName] = symbols;
    }

    public getSymbols(fileName: string): any {
        return this.symbolTable[fileName];
    }
    public enqueueRequest(request: VerificationRequest): void {
        if (!request) {
            throw new Error(`Trying to enqueue an empty request (${request})`);
        }
        this.queue.enqueue(request);
    }

    public collectRequest(serverReturn: string): VerificationResult {
        if (!this.activeRequest) {
            throw new Error("Collect Request was called outside of a active request!");
        }

        this.activeRequest.timeFinished = Date.now();
        const result = this.verificationResults.collect(serverReturn, this.activeRequest);
        return result;
    }

    public addCrashedRequest(request: VerificationRequest | undefined): void {
        this.verificationResults.addCrashed(request);
    }
}

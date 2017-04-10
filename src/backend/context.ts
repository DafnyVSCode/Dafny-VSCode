"use strict";
import * as Collections from "typescript-collections";
import {VerificationRequest} from "./verificationRequest";
import {VerificationResults} from "./verificationResults";

export class Context {
    public queue: Collections.Queue<VerificationRequest> = new Collections.Queue<VerificationRequest>();
    public verificationResults: VerificationResults = new VerificationResults();
    public activeRequest: VerificationRequest = null;
    public serverpid: number;
    public serverversion: string;
    public symbolTable: {[fileName: string]: any} = {};

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

    public collectRequest(serverReturn: string): void {
        this.activeRequest.timeFinished = Date.now();
        this.verificationResults.collect(serverReturn, this.activeRequest);
        this.activeRequest = null;
    }

    public addCrashedRequest(request: VerificationRequest): void {
        this.verificationResults.addCrashed(request);
    }
}

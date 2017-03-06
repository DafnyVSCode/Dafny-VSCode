'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {VerificationResult, VerificationResults} from './verificationResults';
import {Statusbar} from './dafnyStatusbar';
import {ServerStatus} from './serverStatus';
import {VerificationRequest} from './VerificationRequest';

import * as cp from 'child_process';
import * as os from 'os';

//external
import * as b64 from 'base64-js';
import * as utf8 from 'utf8';

//see DafnyServer/VerificationTask.cs in Dafny sources
//it is very straightforwardly JSON serialized/deserialized
export interface VerificationTask {
    args: string[]; //for the verifier itself; consult Dafny sources
    filename: string; //need not be an actual file
    source: string; //actual document source
    sourceIsFile: boolean; //always set to false for our purposes
}

export class DafnyServer {

    //the task we last sent to the dafny server and are expecting a verification log for;
    //becomes null when the log is received
    private activeRequest: VerificationRequest = null;

    //at most 1 waiting request for each opened TextDocument;
    //gets deleted if it becomes the active request
    private queuedRequests: { [docPathName: string]: VerificationRequest } = {};

    //The dafny server runs as a child process (either through mono or .net)
    //IPC is done through stdin/stdout of the server process
    private serverProc: cp.ChildProcess = null;
    private outBuf: string = ''; //stdout accumulator

    private intervalTimer: NodeJS.Timer = null;
    private statusbar : Statusbar;
    private results: VerificationResults;

    constructor(statusbar : Statusbar, results: VerificationResults) {
        this.statusbar = statusbar;
        this.results = results;

        //run timerCallback every now and then to see if there's a queued verification request
        this.intervalTimer = setInterval(this.timerCallback.bind(this), 250);
    }

    //TODO: requirement check in a separat class    
    private testCommand(path: string): boolean {
        let proc = cp.exec(path);
        let good = proc.pid != 0;
        if (good) proc.kill();

        return good;
    }

    public reset(): boolean {
        if (this.serverProc !== null) {
            //detach old callback listeners - this is done to prevent a spurious 'end' event response
            this.serverProc.stdout.removeAllListeners();
            this.serverProc.removeAllListeners();

            this.serverProc.kill();
            //this.serverProc.disconnect(); //TODO: this fails, needs testing without //don't listen to messages any more
            this.serverProc = null;
        }

        this.statusbar.changeStatus(ServerStatus.StatusBarServerStarting);

        let config = vscode.workspace.getConfiguration("dafny");
        let useMono = config.get<boolean>("useMono") || os.platform() !== "win32"; //setting only relevant on windows
        let monoPath = config.get<string>("monoPath");
        let hasCustomMonoPath = monoPath !== "";
        let dafnyServerPath = config.get<string>("dafnyServerPath");

        let command: string;
        let args: string[];

        if (!useMono) {
            command = dafnyServerPath;
            args = [];
        }
        else {
            //see if mono is in PATH
            let monoInSystemPath = this.testCommand("mono");

            //now test specific path
            let monoAtConfigPath = hasCustomMonoPath && this.testCommand(monoPath);
            
            if (monoInSystemPath && !monoAtConfigPath) {
                if (hasCustomMonoPath) {
                    vscode.window.showWarningMessage("dafny.monoPath set incorrectly; found mono in system PATH and will use it")
                }
                monoPath = "mono";
            }
            else if (!monoInSystemPath && !monoAtConfigPath) {
                vscode.window.showErrorMessage("Could not find mono, neither in system PATH nor at dafny.monoPath");
                return false; //failed to start DafnyServer
            }

            command = monoPath;
            args = [dafnyServerPath];       
        }

        let opts: cp.SpawnOptions = {};
        if (vscode.workspace.rootPath) opts.cwd = vscode.workspace.rootPath;
        opts.stdio = [ 
            "pipe", //stdin
            "pipe", //stdout
            0, //ignore stderr 
        ];
        //env?: any;
        //stdio?: any;
        //detached?: boolean;
        //shell?: boolean | string;

        this.serverProc = cp.spawn(command, args, opts);
        let inst = this;

        if (this.serverProc.pid) {
            this.statusbar.pid = this.serverProc.pid;
            
            /*on(event: "close", listener: () => void): this;
            on(event: "readable", listener: () => void): this;
            on(event: "error", listener: (err: Error) => void): this;*/

            this.serverProc.stdout.on('error', (err: Error) => {
                vscode.window.showErrorMessage("DafnyServer process " + inst.serverProc.pid + " error: " + err);
                console.error("dafny server stdout error:" + err.message);
            });

            this.serverProc.stdout.on('data', (data: Buffer) => {
                inst.outBuf += data.toString();
                inst.gotData();
            });

            this.serverProc.on('exit', () => {
                inst.serverProc = null;
                vscode.window.showErrorMessage("DafnyServer process quit unexpectedly; attempting restart");
                setTimeout((inst) => {
                    if (inst.resetServer()) {
                        vscode.window.showInformationMessage("Restart succeeded");
                    }
                    else {
                        vscode.window.showErrorMessage("Restart failed");
                    }
                }, 1000, inst);
                inst.statusbar.update();
            });

            this.statusbar.update();
            return true;
        }

        else {
            this.statusbar.update();
            vscode.window.showErrorMessage("failed to start DafnyServer, check paths in config");
            return false;
        }
    }


    public isRunning() : Boolean {
        //TOOD: better process handling
        return this.serverProc ? true : false;
    }

    public isActive() : Boolean {
        return this.activeRequest ? true : false;
    }

    public remainingRequests() : Number {
        return Object.keys(this.queuedRequests).filter((k) => {
                return !!(this.activeRequest[k]);
            }).length;
    }

    public pid() : Number {
        return this.serverProc ? this.serverProc.pid : -1;
    }


    public addDocument(doc: vscode.TextDocument) {

        let docName = doc.fileName;
        let req = new VerificationRequest(doc.getText(), doc);

        if (this.activeRequest !== null && this.queuedRequests[docName] === this.activeRequest) {
            throw "active document must not be also in queue";
        }

        if (this.activeRequest === null && this.isRunning()) {
            //ignore the queued request (if any) and run the new request directly
            this.activeRequest = req;
            this.statusbar.activeRequest = req;
            this.queuedRequests[docName] = null;
            this.sendVerificationRequest(this.activeRequest);
        } else {
            //overwrite any older requests as this is more up to date
            this.queuedRequests[docName] = req;
        }
    }


    private sendVerificationRequest(req: VerificationRequest) {
        //base64 encode a json encoded DafnyServer.VerificationTask object
        let task: VerificationTask = {
            args: [],
            filename: req.doc.fileName,
            source: req.src,
            sourceIsFile: false
        }

        let json = JSON.stringify(task);
        //let bytesStr:string = querystring.unescape(encodeURIComponent(json));
        let bytesStr = utf8.encode(json);
        
        let bytes = new Uint8Array(bytesStr.length);
        for (var bi = 0; bi < bytesStr.length; bi++) {
            let byte = bytesStr.charCodeAt(bi);
            if (byte < 0 || byte > 255) throw "should be in single byte range";
            bytes[bi] = byte;
        }

        let encoded = b64.fromByteArray(bytes);

        this.outBuf = ''; //clear all output
        
        //write 3 lines in sequence
        let good = this.serverProc.stdin.write("verify\n", () => { //the verify command
            if (!good) throw "not good";
            good = this.serverProc.stdin.write(encoded + "\n", () => { //the base64 encoded task
                if (!good) throw "not good";
                good = this.serverProc.stdin.write("[[DAFNY-CLIENT: EOM]]\n", () => { //the client end of message marker
                    if (!good) throw "not good";
                }); 
            });
        });

        req.timeSent = Date.now();
    }

    private gotData(): void {
        let endId = this.outBuf.search(/\[\[DAFNY-SERVER: EOM\]\]/);
        if (endId != -1) {
            this.activeRequest.timeFinished = Date.now();
            let elapsed = this.activeRequest.timeFinished - this.activeRequest.timeSent;

            //parse output
            let log = this.outBuf.substr(0, endId);
            console.log(log);

            this.results.collect(log, this.activeRequest);

            this.activeRequest = null;
            this.statusbar.activeRequest = null;
            this.outBuf = '';

            this.statusbar.update();
        }
    }



    private timerCallback() {
        let now = Date.now();
        if (this.activeRequest === null && this.isRunning()) {
            //see if there are documents that were recently modified
            
            
            //TODO: what does this code do
            /*for (var ti in this.docChangeTimers) {
                let rec = this.docChangeTimers[ti];
                if (rec.active && (now - rec.lastChange < this.docChangeDelay)) {
                    if (rec.doc === vscode.window.activeTextEditor.document) {
                        this.currentDocStatucBarTxt.text = "$(radio-tower)Verification request sent";
                    }
                    this.queuedRequests[ti] = new VerificationRequest(rec.doc.getText(), rec.doc);
                    rec.active = false;
                }
            }*/
            
            //schedule the oldest request first
            let oldest: VerificationRequest = null;
            let oldestName: string = null;
            for (var ni in this.queuedRequests) {
                var req = this.queuedRequests[ni];
                if (req) {
                    if (!oldest || oldest.timeCreated > req.timeCreated) {
                        oldest = req;
                        oldestName = ni;
                    }
                }
            }

            if (oldest) {
                if (oldest.doc === vscode.window.activeTextEditor.document) {
                    //this.currentDocStatucBarTxt.text = "$(beaker)Verifying..";
                    this.statusbar.changeStatus(ServerStatus.StatusBarVerifying);
                }

                this.queuedRequests[oldestName] = null;
                this.activeRequest = oldest;
                this.statusbar.activeRequest = oldest;
                this.sendVerificationRequest(oldest);
            }
        }

        //this.updateStatusBars();
    }

    


}

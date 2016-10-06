/// <reference path="../typings/index.d.ts" />

'use strict';

//node
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;
import * as querystring from 'querystring';

//vscode
import * as vscode from 'vscode';

//external
import * as b64 from 'base64-js';
import * as utf8 from 'utf8';


//see DafnyServer/VerificationTask.cs in Dafny sources
//it is very straightforwardly JSON serialized/deserialized
interface VerificationTask {
    args: string[]; //for the verifier itself; consult Dafny sources
    filename: string; //need not be an actual file
    source: string; //actual document source
    sourceIsFile: boolean; //always set to false for our purposes
}

//http://stackoverflow.com/a/3561711/1461208
export function regexEscape(s: string) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

class VerificationRequest {
    public doc: vscode.TextDocument;
    public src: string; //avoid calling doc.getText() again (not sure if it may change while extension code is running)
    public srcEnds: number[];
    public timeCreated: number;
    public timeSent: number = 0; //not known yet
    public timeFinished: number = 0; //not known yet

    constructor (src: string, doc: vscode.TextDocument) {
        this.doc = doc;
        this.src = src;
        this.timeCreated = Date.now();

        let lines = src.split('\n');
        this.srcEnds = new Array(lines.length);
        
         for (var li in lines) {
            var line = lines[li];
            this.srcEnds[li] = line.length;
        }
    }
}

export class DafnyDiagnosticsProvider {
    private diagCol: vscode.DiagnosticCollection = null;

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

    constructor() {
        this.diagCol = vscode.languages.createDiagnosticCollection("dafny");
        this.resetServer();

        //run timerCallback every now and then to see if there's a queued verification request
        this.intervalTimer = setInterval(this.timerCallback.bind(this), 500);
    }

    private resetServer() {
        if (this.serverProc !== null) {
            this.serverProc.kill();
            this.serverProc.disconnect(); //don't listen to messages any more
            this.serverProc = null;
            vscode.window.setStatusBarMessage("Dafny verifier: restarted mono+DafnyServer");
        }

        let config = vscode.workspace.getConfiguration("dafny");
        let useMono = config.get<boolean>("useMono"); 
        let monoPath = config.get<string>("monoPath");
        let dafnyServerPath = config.get<string>("dafnyServerPath");

        let command: string;
        let args: string[];

        if (os.platform() === "win32" && !useMono) {
            command = dafnyServerPath;
            args = [];
        }
        else {
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

        this.serverProc = cp.spawn(monoPath, args, opts);
        let inst = this;

        if (this.serverProc.pid) {
            /*on(event: "close", listener: () => void): this;
            on(event: "data", listener: (chunk: Buffer | string) => void): this;
            on(event: "end", listener: () => void): this;
            on(event: "readable", listener: () => void): this;
            on(event: "error", listener: (err: Error) => void): this;*/

            this.serverProc.stdout.on('error', (err: Error) => {
                vscode.window.showErrorMessage("DafnyServer process " + this.serverProc.pid + " error: " + err);
                console.error("dafny server stdout error:" + err.message);
            });

            this.serverProc.stdout.on('data', (data: Buffer) => {
                inst.outBuf += data.toString();
                inst.gotData();
            });

            this.serverProc.stdout.on('end', () => {
                vscode.window.showInformationMessage("DafnyServer process " + this.serverProc.pid + " quit");
            });

            vscode.window.setStatusBarMessage("Dafny verifier: started DafnyServer");
        }

        else {
            vscode.window.setStatusBarMessage("Dafny verifier error: failed to start DafnyServer");
        }
    }

    private doVerify(textDocument: vscode.TextDocument) {
        if (textDocument.languageId === 'dafny') {
            let docName = textDocument.fileName;
            let req = new VerificationRequest(textDocument.getText(), textDocument);

            if (this.activeRequest !== null && this.queuedRequests[docName] === this.activeRequest) {
                throw "active document must not be also in queue";
            }

            if (this.activeRequest === null) {
                //ignore the queued request and run the new request directly, instead
                this.activeRequest = req;
                this.queuedRequests[docName] = null;
                this.sendVerificationRequest(this.activeRequest);
            }
            else {
                //overwrite any older requests as this is more up to date
                this.queuedRequests[docName] = req;
            }
        }
    }

    private docChanged(change: vscode.TextDocumentChangeEvent) {
        //TODO: still typing/modifying timing check, call doVerify when 'debounced'
    }

    private timerCallback() {
        if (this.activeRequest === null) {
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
                this.queuedRequests[oldestName] = null;
                this.activeRequest = oldest;
                this.sendVerificationRequest(oldest);
            }
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
            vscode.window.setStatusBarMessage("Dafny verifier: completed " + this.activeRequest.doc.fileName + " verification in " + elapsed + "time");

            //parse output
            let log = this.outBuf.substr(0, endId);
            this.parseVerifierLog(log, this.activeRequest);
            this.activeRequest = null;
            this.outBuf = '';
        }
    }

    private parseVerifierLog(log: string, req: VerificationRequest) {
        let lines = log.split('\n');
        let reg = new RegExp("^" + regexEscape(req.doc.fileName) + "\\((\\d+),(\\d+)\\): (Error|Warning): (.*)$");
        var diags: vscode.Diagnostic[] = [];

        for (var li in lines) {
            let line = lines[li];
            let m = reg.exec(line);

            if (m) {
                let line = parseInt(m[1], 10) - 1; //1 based
                let col = parseInt(m[2], 10);
                let type = m[3];
                let msg = m[4];

                let start = new vscode.Position(line, col);
                let wr = req.doc.getWordRangeAtPosition(start);

                //let end = new vscode.Position(line, req.srcEnds[line]);
                //let range = new vscode.Range(start, end);
                let severity = (type === "Error") ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;

                diags.push(new vscode.Diagnostic(wr, msg, severity));

            }
        }

        this.diagCol.set(req.doc.uri, diags);
    }

    public activate(subs: vscode.Disposable[]) {
        subs.push(this);

        vscode.workspace.onDidOpenTextDocument(this.doVerify, this, subs);
        vscode.workspace.onDidCloseTextDocument((textDocument)=> {
            this.diagCol.delete(textDocument.uri);
        }, null, subs);

        vscode.workspace.onDidChangeTextDocument(this.docChanged, this);
        vscode.workspace.onDidSaveTextDocument(this.doVerify, this);
        vscode.workspace.textDocuments.forEach(this.doVerify, this); //verify each active document
    }
    
    public dispose() {
        this.diagCol.clear();
        this.diagCol.dispose();
        vscode.window.showInformationMessage("DafnyProvder disposed");
    }
}
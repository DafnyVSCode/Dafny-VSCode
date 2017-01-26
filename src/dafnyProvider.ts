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

export enum VerificationResult {
    Verified = 0,
    NotVerified = 1,
    Failed = 2
};

class VerificationRequest {
    public doc: vscode.TextDocument;
    public src: string; //avoid calling doc.getText() again (not sure if it may change while extension code is running)
    public srcEnds: number[];
    public timeCreated: number;
    public timeSent: number = 0; //not known yet
    public timeFinished: number = 0; //not known yet
    public logParseRegex: RegExp = null;

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

        this.logParseRegex = new RegExp("^" + regexEscape(doc.fileName) + "\\((\\d+),(\\d+)\\): (Error|Warning|Info)( \\w+)?: (.*)$");
    }
}

class DocChangeTimerRecord {
    public active: boolean = false;
    constructor (
        public doc: vscode.TextDocument,
        public lastChange: number //epoch ms (use Date.now())
    ) {}
}

export class DafnyDiagnosticsProvider {
    private diagCol: vscode.DiagnosticCollection = null;

    //the task we last sent to the dafny server and are expecting a verification log for;
    //becomes null when the log is received
    private activeRequest: VerificationRequest = null;

    //at most 1 waiting request for each opened TextDocument;
    //gets deleted if it becomes the active request
    private queuedRequests: { [docPathName: string]: VerificationRequest } = {};

    //the latest results related to each file
    private latestResults: { [docPathName: string]: VerificationResult } = {};

    //onTextChanged events are sent on each character change,
    //but we only want to send a verification request after a bunch of changes are done
    private docChangeTimers: { [docPathName: string]: DocChangeTimerRecord } = {};
    private docChangeVerify: boolean = false; //dafny.automaticVerification config param
    private docChangeDelay: number = 0; //dafny.automaticVerificationDelayMS config param

    //The dafny server runs as a child process (either through mono or .net)
    //IPC is done through stdin/stdout of the server process
    private serverProc: cp.ChildProcess = null;
    private outBuf: string = ''; //stdout accumulator

    private intervalTimer: NodeJS.Timer = null;

    //used to display information about the progress of verification
    private verificationStatusBarTxt: vscode.StatusBarItem = null;

    //used to display typing/verifying/error count status
    private currentDocStatucBarTxt: vscode.StatusBarItem = null;

    private currentEditor: vscode.TextEditor = null;

    private static StatusBarVerifying = "$(sync) Verifying";
    private static StatusBarQueued = "$(sync) Queued for verification";
    private static StatusBarServerOff = "$(x) Verification server off";
    private static StatusBarVerified = "$(thumbsup) Verified";
    private static StatusBarNotVerified = "$(thumbsdown) Not verified";

    private static verificationResultToString (res: VerificationResult): string {
        switch(res){
            case VerificationResult.Verified: return DafnyDiagnosticsProvider.StatusBarVerified;
            case VerificationResult.NotVerified: return DafnyDiagnosticsProvider.StatusBarNotVerified;
        }
        return "$(x) Verification technical error";
    }

    constructor() {
        this.currentEditor = vscode.window.activeTextEditor;
        this.diagCol = vscode.languages.createDiagnosticCollection("dafny");
        
        this.currentDocStatucBarTxt = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
        this.verificationStatusBarTxt = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);

        let config = vscode.workspace.getConfiguration("dafny");
        this.docChangeVerify = config.get<boolean>("automaticVerification");
        this.docChangeDelay = config.get<number>("automaticVerificationDelayMS");

        this.resetServer();

        //run timerCallback every now and then to see if there's a queued verification request
        this.intervalTimer = setInterval(this.timerCallback.bind(this), 250);
    }

    private updateStatusBars() {
        let editor = this.currentEditor;
        //editor.document is a get() that can try to resolve an undefined value
        let editorsOpen = vscode.window.visibleTextEditors.length;
        if (!editor || editorsOpen == 0 || editor.document.languageId !== 'dafny') {
            //disable UI on other doc types or when vscode.window.activeTextEditor is undefined
            this.verificationStatusBarTxt.hide();
            this.currentDocStatucBarTxt.hide();
        }
        else {
            if (!this.serverProc) {
                this.currentDocStatucBarTxt.text = DafnyDiagnosticsProvider.StatusBarServerOff;
                this.verificationStatusBarTxt.text = "$(x)DafnyServer not started";
            }
            else {
                if (this.activeRequest) {
                    let remaining = Object.keys(this.queuedRequests).filter((k) => {
                        return !!(this.activeRequest[k]);
                    }).length;

                    //set status bar text
                    this.verificationStatusBarTxt.text = "$(beaker)Verifying " + this.activeRequest.doc.fileName;
                    if (remaining > 0) this.verificationStatusBarTxt.text += " (+ " + remaining.toString(10) + " queued)";
                }
                else {
                    this.verificationStatusBarTxt.text = "$(watch)DafnyServer idle";
                }
                this.verificationStatusBarTxt.text += " (pid " + this.serverProc.pid + ")";

                if (this.activeRequest && editor.document === this.activeRequest.doc) {
                    this.currentDocStatucBarTxt.text = DafnyDiagnosticsProvider.StatusBarVerifying;
                }
                else if (this.queuedRequests[editor.document.fileName]) {
                    this.currentDocStatucBarTxt.text = DafnyDiagnosticsProvider.StatusBarQueued;
                }
                else {
                    let res: undefined | VerificationResult = this.latestResults[editor.document.fileName];
                    if (res !== undefined) {
                        this.currentDocStatucBarTxt.text = DafnyDiagnosticsProvider.verificationResultToString(res);
                    }
                }
            }

            this.verificationStatusBarTxt.show();
            this.currentDocStatucBarTxt.show();
        }
    }

    private testCommand(path: string): boolean {
        let proc = cp.exec(path);
        let good = proc.pid != 0;
        if (good) proc.kill();

        return good;
    }

    public resetServer(): boolean {
        if (this.serverProc !== null) {
            //detach old callback listeners - this is done to prevent a spurious 'end' event response
            this.serverProc.stdout.removeAllListeners();
            this.serverProc.removeAllListeners();

            this.serverProc.kill();
            //this.serverProc.disconnect(); //TODO: this fails, needs testing without //don't listen to messages any more
            this.serverProc = null;
        }

        this.updateStatusBars();

        this.verificationStatusBarTxt.text = "starting DafnyServer..";
        this.verificationStatusBarTxt.show();

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
                inst.updateStatusBars();
            });

            this.updateStatusBars();
            return true;
        }

        else {
            this.updateStatusBars();
            vscode.window.showErrorMessage("failed to start DafnyServer, check paths in config");
            return false;
        }
    }

    private doVerify(textDocument: vscode.TextDocument) {
        if (textDocument.languageId === 'dafny') {
            this.currentDocStatucBarTxt.show();

            let docName = textDocument.fileName;
            let req = new VerificationRequest(textDocument.getText(), textDocument);

            if (this.activeRequest !== null && this.queuedRequests[docName] === this.activeRequest) {
                throw "active document must not be also in queue";
            }

            if (this.activeRequest === null && this.serverProc) {
                //ignore the queued request (if any) and run the new request directly
                this.activeRequest = req;
                this.queuedRequests[docName] = null;
                this.sendVerificationRequest(this.activeRequest);
            }
            else {
                //overwrite any older requests as this is more up to date
                this.queuedRequests[docName] = req;
            }

            this.updateStatusBars();
        }
    }

    private docChanged(change: vscode.TextDocumentChangeEvent) {
        if (change.document.languageId === 'dafny') {
            //TODO: check if this is too slow to be done every time
            if (this.docChangeVerify) {
                let now = Date.now();
                let docName = change.document.fileName;

                let rec: DocChangeTimerRecord = null;
                if (this.docChangeTimers[docName]) {
                    rec = this.docChangeTimers[docName];
                }
                else {
                    rec = new DocChangeTimerRecord(change.document, now);
                    this.docChangeTimers[docName] = rec;
                }

                rec.active = true;
                rec.lastChange = now;

                if (change.document === vscode.window.activeTextEditor.document) {
                    this.currentDocStatucBarTxt.text = "$(clock)Typing..";
                }
            }
        }
    }

    private timerCallback() {
        let now = Date.now();
        if (this.activeRequest === null && this.serverProc) {
            //see if there are documents that were recently modified
            for (var ti in this.docChangeTimers) {
                let rec = this.docChangeTimers[ti];
                if (rec.active && (now - rec.lastChange < this.docChangeDelay)) {
                    if (rec.doc === vscode.window.activeTextEditor.document) {
                        this.currentDocStatucBarTxt.text = "$(radio-tower)Verification request sent";
                    }
                    this.queuedRequests[ti] = new VerificationRequest(rec.doc.getText(), rec.doc);
                    rec.active = false;
                }
            }
            
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
                    this.currentDocStatucBarTxt.text = "$(beaker)Verifying..";
                }

                this.queuedRequests[oldestName] = null;
                this.activeRequest = oldest;
                this.sendVerificationRequest(oldest);
            }
        }

        this.updateStatusBars();
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
            let errorCount = this.parseVerifierLog(log, this.activeRequest);
            let fileName = this.activeRequest.doc.fileName;
            this.activeRequest = null;
            this.outBuf = '';

            this.latestResults[fileName] = 
                (errorCount == 0)? VerificationResult.Verified : VerificationResult.NotVerified;

            this.updateStatusBars();
        }
    }

    //returns number of errors (that is, excluding warnings, infos, etc)
    private parseVerifierLog(log: string, req: VerificationRequest): number {
        let lines = log.split('\n');
        let diags: vscode.Diagnostic[] = [];
        let errCount = 0;

        for (var li in lines) {
            let line = lines[li];
            let m = req.logParseRegex.exec(line);

            if (m) {
                let lineNum = parseInt(m[1], 10) - 1; //1 based
                let colNum = Math.max(0, parseInt(m[2], 10) - 1); //ditto, but 0 can appear in some cases
                let typeStr = m[3];
                let msgStr = m[4] !== undefined? m[4] + ": " + m[5] : m[5];

                let start = new vscode.Position(lineNum, colNum);
                let line = req.doc.lineAt(start);
                //let rangeOnWord = req.doc.getWordRangeAtPosition(start);
                //let range = rangeOnWord || line.range; //sometimes rangeOnWord in undefined
                let range = line.range;

                let severity = (typeStr === "Error") ? 
                    vscode.DiagnosticSeverity.Error : (typeStr === "Warning")?
                    vscode.DiagnosticSeverity.Warning :
                    vscode.DiagnosticSeverity.Information;

                if (severity === vscode.DiagnosticSeverity.Error) {
                    errCount++;
                }

                diags.push(new vscode.Diagnostic(range, msgStr, severity));
            }
        }

        this.diagCol.set(req.doc.uri, diags);
        return errCount;
    }

    public activate(subs: vscode.Disposable[]) {
        vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
            if (editor) { //may be undefined
                this.currentEditor = editor;
                this.updateStatusBars();
            }
        }, this);

        vscode.workspace.onDidOpenTextDocument(this.doVerify, this);
        vscode.workspace.onDidCloseTextDocument((textDocument)=> {
            this.diagCol.delete(textDocument.uri);
        }, this);

        vscode.workspace.onDidChangeTextDocument(this.docChanged, this);
        vscode.workspace.onDidSaveTextDocument(this.doVerify, this);
        vscode.workspace.textDocuments.forEach(this.doVerify, this); //verify each active document
    }
    
    public dispose() {
        this.diagCol.clear();
        this.diagCol.dispose();
        //vscode.window.showInformationMessage("DafnyProvder disposed");
    }
}
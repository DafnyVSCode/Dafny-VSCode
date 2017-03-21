import * as cp from "child_process";
import {CommandEndFailedException, DafnyServerExeption,
    VericationCommandFailedException, VericationRequestFailedException} from "../ErrorHandling/errors";

export class ProcessWrapper {
    public pid: number;
    public outBuf: string = "";
    private serverProc: cp.ChildProcess = null;
    private commandEndRegex: RegExp = /\[\[DAFNY-SERVER: EOM\]\]/;
    constructor(
        process: cp.ChildProcess,
        errorCallback: (error: Error) => void,
        dataCallback: () => void,
        exitCallback: (code: number) => void,
        commandEndRegex: RegExp) {
        if(!process.pid) {
            throw new DafnyServerExeption();
        }
        this.pid = process.pid;
        this.commandEndRegex = commandEndRegex;
        this.serverProc = process;
        this.serverProc.stdout.on("error", errorCallback);
        this.serverProc.stdout.on("data", (data: Buffer) => {
            this.outBuf += data.toString();
            dataCallback();
        });
        this.serverProc.on("exit", exitCallback);
    }

    public reasignCallbacks(errorCallback: (error: Error) => void,
                            dataCallback: () => void,
                            exitCallback: (code: number) => void): void {
        this.serverProc.stdout.removeAllListeners();
        this.serverProc.removeAllListeners();
        this.serverProc.stdout.on("error", errorCallback);
        this.serverProc.stdout.on("data", (data: Buffer) => {
            this.outBuf += data.toString();
            dataCallback();
        });
        this.serverProc.on("exit", exitCallback);
    }
    public killServerProc(): void {
        // detach old callback listeners - this is done to prevent a spurious 'end' event response
        this.serverProc.stdout.removeAllListeners();
        this.serverProc.removeAllListeners();
        this.serverProc.kill();
    }

    public isAlive(): boolean  {
        return this.serverProc !== null;
    }

    public clearBuffer(): void {
        this.outBuf = "";
    }
    public writeVerificationRequestToServer(request: string): void {
        let good: boolean = this.serverProc.stdin.write("verify\n", () => { // the verify command
            if (!good) {
                throw new VericationCommandFailedException("Verification command failed of request: ${request}");
            }
            good = this.serverProc.stdin.write(request + "\n", () => { // the base64 encoded task
                if (!good) {
                    throw new VericationRequestFailedException("Verification request failed of task: ${request}");
                }
                good = this.serverProc.stdin.write("[[DAFNY-CLIENT: EOM]]\n", () => { // the client end of message marker
                    if (!good) {
                        throw new CommandEndFailedException("Verification command end failed of task: ${request}");
                    }
                });
            });
        });
    }

    public writeDefinitionRequestToDafnyDef(request: string): void {
        let good: boolean = this.serverProc.stdin.write("findDefinition\n", () => { // the verify command
            if (!good) {
                throw new VericationCommandFailedException("Verification command failed of request: ${request}");
            }
            good = this.serverProc.stdin.write(request + "\n", () => { // the base64 encoded task
                if (!good) {
                    throw new VericationRequestFailedException("Verification request failed of task: ${request}");
                }
                good = this.serverProc.stdin.write("[[DafnyDef-CLIENT: EOM]]\n", () => { // the client end of message marker
                    if (!good) {
                        throw new CommandEndFailedException("Verification command end failed of task: ${request}");
                    }
                });
            });
        });
    }

    public sendQuit(): void {
        const good: boolean = this.serverProc.stdin.write("quit\n", () => { // the verify command
            if (!good) {
                throw new VericationCommandFailedException("Sending of quit failed");
            }
        });
    }

    public commandFinished(): boolean {
        return this.outBuf.search(this.commandEndRegex) > -1;
    }

    public positionCommandEnd(): number {
        return this.outBuf.search(this.commandEndRegex);
    }
}

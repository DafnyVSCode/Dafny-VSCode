import * as cp from "child_process";
import {CommandEndFailedException,
    VericationCommandFailedException, VericationRequestFailedException} from "../errors";
import { DafnyServerExeption } from "./../errors";

export class ProcessWrapper {
    public pid: number;
    public outBuf: string = "";
    private serverProc: cp.ChildProcess = null;
    constructor(
        process: cp.ChildProcess,
        errorCallback: (error: Error) => void,
        dataCallback: () => void, exitCallback: () => void) {
        if(!process.pid) {
            throw new DafnyServerExeption();
        }
        this.pid = process.pid;
        this.serverProc = process;
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

    public WriteVerificationRequestToServer(request: string): void {
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
}

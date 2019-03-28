import { ResponseError } from "vscode-jsonrpc";

export default class ServerNotReadyResponseError extends ResponseError<void> {
    constructor() {
    super(32001, "The Server was not ready to handle the client request");
    }
}

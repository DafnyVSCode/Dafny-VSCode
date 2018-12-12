import { CommandFailedException } from "./CommandFailedException";
export class RequestFailedException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CommandFailedException.prototype);
    }
}

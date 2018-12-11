import { CommandFailedException } from "./CommandFailedException";
export class CommandEndFailedException extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CommandFailedException.prototype);
    }
}

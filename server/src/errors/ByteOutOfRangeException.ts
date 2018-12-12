export class ByteOutOfRangeException extends Error {
    constructor() {
        super("Byte value should be single between 0 and 255");
        Object.setPrototypeOf(this, ByteOutOfRangeException.prototype);
    }
}

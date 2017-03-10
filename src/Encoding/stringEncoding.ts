"use strict";
import * as b64 from "base64-js";
import * as utf8 from "utf8";
import { IVerificationTask } from "./../dafnyServer";
import {ByteOutOfRangeException} from "./../errors";

export function EncodeBase64(task: IVerificationTask): string {
    const jsonString: string = JSON.stringify(task);
    const bytesString: string = utf8.encode(jsonString);
    const bytes: Uint8Array = ConvertStringToBytes(bytesString);
    return b64.fromByteArray(bytes);
}

function ConvertStringToBytes(bytesString: string): Uint8Array {
    const bytes: Uint8Array = new Uint8Array(bytesString.length);
    for (let bi: number = 0; bi < bytesString.length; bi++) {
        const byte: number = bytesString.charCodeAt(bi);
        if (byte < 0 || byte > 255) {
            throw new ByteOutOfRangeException();
        }
        bytes[bi] = byte;
    }
    return bytes;
}

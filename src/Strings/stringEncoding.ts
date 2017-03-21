"use strict";
import * as b64 from "base64-js";
import * as utf8 from "utf8";
import {ByteOutOfRangeException} from "../ErrorHandling/errors";

export function encodeBase64(task: any): string {
    const jsonString: string = JSON.stringify(task);
    const bytesString: string = utf8.encode(jsonString);
    const bytes: Uint8Array = convertStringToBytes(bytesString);
    return b64.fromByteArray(bytes);
}

function convertStringToBytes(bytesString: string): Uint8Array {
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

export function decodeBase64(task: string): any {
    const byteArray = b64.toByteArray(task);
    let ret = "";
    for(const byte of byteArray) {
        ret += String.fromCharCode(byte);
    }
    return JSON.parse(ret);
}

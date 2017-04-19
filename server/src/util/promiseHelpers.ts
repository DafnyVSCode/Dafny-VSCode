"use strict";

export function bubbleRejectedPromise(err: any): Promise<any> {
    console.error(err);
    return Promise.reject(err);
}

"use strict";

export class LocalQueue {

    private list: string[] = [];

    public add(uri: string): void {
        console.log("add " + uri);
        this.list.push(uri);
    }

    public remove(uri: string): void {
        console.log("remove " + uri);
        this.list = this.list.filter((el) => el !== uri);
    }

    public contains(uri: string): boolean {
        console.log("contains " + uri);
        return this.list.indexOf(uri) !== -1;
    }
}

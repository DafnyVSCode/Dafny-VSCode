import { Range } from "vscode-languageserver";
import Uri from "vscode-uri";
export class ReferenceInformation {
    public fileName: Uri;
    public range: Range;
    constructor(range: Range, file: Uri) {
        this.range = range;
        this.fileName = file;
    }
}

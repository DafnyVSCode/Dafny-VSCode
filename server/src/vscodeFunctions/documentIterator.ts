
import {Position} from "vscode-languageserver";
import { DocumentDecorator } from "./documentDecorator";

export class DocumentIterator {

    public documentDecorator: DocumentDecorator;
    public lineIndex: number;
    public charIndex: number;
    public currentLine: string;
    public currentChar: string; 
    public isValidPosition: boolean = true;

    constructor(documentDecorator: DocumentDecorator, startPosition: Position = null) {
        this.documentDecorator = documentDecorator;
        if(startPosition) {
            this.lineIndex = startPosition.line;
            this.charIndex = startPosition.character;
            this.currentLine = this.documentDecorator._lines[this.lineIndex];
            this.currentChar = this.currentLine.charAt(this.charIndex);
        }
    }

    public skipChar() {
        if(!this.isValidPosition) {
            return;
        }
        this.charIndex++;
        if(this.charIndex >= this.currentLine.length) {
            this.lineIndex++;
            if(this.lineIndex >= this.documentDecorator._lines.length) {
                this.isValidPosition = false;
                return;
            }
            this.currentLine = this.documentDecorator._lines[this.lineIndex];
            this.charIndex = 0;
        }
        this.currentChar =  this.currentLine.charAt(this.charIndex);
    }

    public moveBack() {
        if(!this.isValidPosition) {
            return;
        }
        this.charIndex--;
        if(this.charIndex < 0) {
            this.lineIndex--;
            if(this.lineIndex < 0) {
                this.isValidPosition = false;
                return;
            }
            this.currentLine = this.documentDecorator._lines[this.lineIndex];
            this.charIndex = this.currentLine.length - 1;
        }
        this.currentChar = this.currentLine.charAt(this.charIndex);
    }

    public skipWhiteSpace() {
        while(this.isValidPosition && " \t\n\r\v".indexOf(this.currentChar) > -1) {
            this.skipChar();
        }
    }
    public skipWord() {
         while(this.isValidPosition && !/[^a-zA-Z0-9]/.test(this.currentChar)) {
            this.skipChar();
        }
    }

    public skipWordBack() {
         while(this.isValidPosition && !/[^a-zA-Z0-9]/.test(this.currentChar)) {
            this.moveBack();
        }
    }
    public skipToChar(char: string) {
        let foundChar: boolean = false;
        while(this.isValidPosition && !foundChar) {
            const searchIndex = this.currentLine.indexOf(char);
            if(searchIndex > 0 && searchIndex > this.charIndex) {
                this.charIndex = searchIndex;
                this.currentChar =  this.currentLine.charAt(this.charIndex);
                foundChar = true;
            } else {
                this.skipChar();
            }
        }
    }

    public moveBackToChar(char: string) {
        let foundChar: boolean = false;
        while(this.isValidPosition && !foundChar) {
            const searchIndex = this.currentLine.indexOf(char);
            if(searchIndex > 0 && searchIndex < this.charIndex) {
                this.charIndex = searchIndex;
                this.currentChar =  this.currentLine.charAt(this.charIndex);
                foundChar = true;
            } else {
                this.moveBack();
            }
        }
    }

    public isInfrontOf(position: Position) {
        return this.lineIndex < position.line ||
            ( this.lineIndex === position.line && this.charIndex < position.character);
    }

    public isAfter(position: Position) {
        return this.lineIndex > position.line ||
            (this.lineIndex === position.line && this.charIndex > position.character);
    }
}

"use strict";

export class Verification {
    public static LogParseRegex = new RegExp(/\((\d+),(\d+)\):\s*(?:Verification of.*)?(Error|Warning|Info|timed out after|Timed out on|Out of memory on|Out of resource on)[^:]*?(?::?)\s*(.*)/);
    public static NumberOfProofObligations = new RegExp(/\[(\d+) proof obligation(s|)\]\s+(verified|error)/);
    public static RelatedLocationRegex = new RegExp(/\((\d+),(\d+)\):\s*Related location:\s*(.*)/);
}

"use strict";

export class Verification {
    public static LogParseRegex = new RegExp(/\((\d+),(\d+)\):\s*(Error|Warning|Info).*?: (.*)/);
    public static NumberOfProofObligations = new RegExp(/\[(\d+) proof obligation(s|)\]\s+(verified|error)/);
    public static RelatedLocationRegex = new RegExp(/\((\d+),(\d+)\):\s*Related location:\s*(.*)/);
}

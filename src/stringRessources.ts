export class Strings {
    public static Warning: string = "Warning";
    public static Error: string = "Error";
    public static ServerPathNotSet: string = "Dafny Verifier error: dafnyServerPath not set";
    public static Verified: string = "$(thumbsup) Verified";
    public static NotVerified: string = "$(thumbsdown) Not verified";
    public static TechnicalError: string = "$(x) Verification technical error";
    public static ServerUp: string = "$(up) Server up";
    public static ServerDown: string = "$(x) Server down";
    public static Queued: string =  "$(watch) Queued";
    public static Dafny: string = "dafny";
    public static MonoPathWrong: string = "dafny.monoPath set incorrectly; found mono in system PATH and will use it";
    public static NoMono: string = "Could not find mono, neither in system PATH nor at dafny.monoPath";
    public static Mono: string = "mono";
    public static Idle: string = "$(clock) Idle";
    public static DafnyServerRestart: string = "DafnyServer process quit unexpectedly; attempting restart";
    public static DafnyServerRestartSucceded: string = "DafnyServer restart succeeded";
    public static DafnyServerRestartFailed: string = "DafnyServer restart failed";
    public static DafnyServerWrongPath: string = "failed to start DafnyServer, check paths in config";
    public static Verifying: string = "$(beaker) Verifying";
    public static Starting: string = "Starting";
}
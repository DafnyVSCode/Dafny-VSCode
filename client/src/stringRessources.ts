"use strict";

export class Severity {
    public static Warning: string = "Warning";
    public static Error: string = "Error";

}
export class WarningMsg {
    public static MonoPathWrong: string = "dafny.monoPath set incorrectly; found mono in system PATH and will use it";
}

export class ErrorMsg {
    public static NoMono: string = "Could not find mono, neither in system PATH nor at dafny.monoPath";
    public static DafnyServerRestart: string = "DafnyServer process quit unexpectedly; attempting restart";
    public static DafnyServerRestartFailed: string = "DafnyServer restart failed";
    public static DafnyServerWrongPath: string = "Failed to start DafnyServer, check paths in config";
    public static ServerPathNotSet: string = "Dafny Verifier error: dafnyServerPath not set";
    public static DafnyInstallationFailed: string = "Automatic installation failed. Please install manually.";
    public static MaxRetriesReached: string = "Maximum retries to start the server reached. Please restart the server manually";
    public static DafnyCantBeStarted: string = "DafnyServer.exe can not be started. Either it is not installed or the basepath is wrong";
    public static NoMainMethod: string = "Can't start a program without a Main method";
}

export class Config {
    public static MonoPath: string = "monoPath";
    public static UseMono: string = "useMono";
    public static AutomaticVerification: string = "automaticVerification";
    public static AutomaticVerificationDelay: string = "automaticVerificationDelayMS";
    public static DafnyBasePath: string = "basePath";
}

export class Application {
    public static DafnyServer: string = "DafnyServer.exe";
}

export class Commands {
    public static RestartServer: string = "dafny.restartDafnyServer";
    public static InstallDafny: string = "dafny.installDafny";
    public static UninstallDafny: string = "dafny.uninstallDafny";
    public static EditText: string = "dafny.editText";
    public static ShowReferences: string = "dafny.showReferences";
    public static Compile: string = "dafny.compile";
    public static CompileAndRun: string = "dafny.compileAndRun";
}

export class InfoMsg {
    public static DafnyServerRestartSucceded: string = "DafnyServer restart succeeded";
    public static DafnyInstallationSucceeded: string = "Automatic installation complete";
    public static DafnyUninstallationSucceeded: string = "Uninstallation complete";
    public static DafnyUpdateAvailable: string = "Update of Dafny is available. Would you like to update it?";
    public static AskInstallDafny: string = "Would you like to install Dafny?";
    public static CompilationStarted: string = "Compilation started";
    public static CompilationFinished: string = "Compilation finished";
}
export class ServerStatus {
    public static Starting: string = "Starting";
}

export class Answer {
    public static Yes: string = "Yes";
    public static No: string = "No";
}

export class EnvironmentConfig {
    public static Dafny: string = "dafny";
    public static Mono: string = "mono";
    public static NewLine: string = "\n";
    public static Win32: string = "win32";
    public static OSX: string = "darwin";
    public static Ubuntu: string = "linux";
    public static DafnySuccess: string = "[SUCCESS]";
    public static DafnyFailure: string = "[FAILURE]";
}
export class StatusString {
    public static Crashed: string = "$(alert) Crashed";
    public static Verifying: string = "$(beaker) Verifying";
    public static Idle: string = "$(clock) Idle";
    public static Verified: string = "$(thumbsup) Verified";
    public static NotVerified: string = "$(thumbsdown) Not verified";
    public static TechnicalError: string = "$(x) Verification technical error";
    public static ServerUp: string = "$(up) Server up";
    public static ServerDown: string = "$(x) Server down";
    public static Queued: string = "$(watch) Queued";
    public static Pending: string = "$(issue-opened) Pending";
}

export class LanguageServerRequest {
    public static Reset: string = "reset";
    public static Stop: string = "stop";
    public static Compile: string = "compile";
}

export class LanguageServerNotification {
    public static Error: string = "ERROR";
    public static Warning: string = "WARNING";
    public static Info: string = "INFO";
    public static DafnyMissing: string = "dafnymissing";
    public static Verify: string = "verify";
    public static QueueSize: string = "queueSize";
    public static ServerStarted: string = "serverStarted";
    public static ActiveVerifiyingDocument: string = "activeVerifiyingDocument";
    public static VerificationResult: string = "verificationResult";
    public static ChangeServerStatus: string = "changeServerStatus";
    public static Ready: string = "ready";
}

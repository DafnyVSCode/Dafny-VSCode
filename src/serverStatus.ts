

export class ServerStatus {

    public message : string;
    private constructor(message : string) {
        this.message = message;
    }

    public static StatusBarServerStarting : ServerStatus = new ServerStatus("starting DafnyServer..");
    public static StatusBarVerifying : ServerStatus = new ServerStatus("$(sync) Verifying");
    public static StatusBarQueued : ServerStatus  = new ServerStatus("$(sync) Queued for verification");
    public static StatusBarServerOff : ServerStatus  = new ServerStatus( "$(x) Verification server off");
    public static StatusBarIdle : ServerStatus  = new ServerStatus( "$(watch)DafnyServer idle");

}


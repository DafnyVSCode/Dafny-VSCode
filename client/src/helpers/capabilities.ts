import { execFileSync } from "child_process";
import * as os from "os";
import { log } from "util";
import { workspace } from "vscode";
import { Config, EnvironmentConfig } from "../stringRessources";

/**
 * Check for supported capabilities (mono/.net runtime, dafny etc.)
 */
export default class Capabilities {

    public static config = workspace.getConfiguration(EnvironmentConfig.Dafny);

    public static hasSupportedMonoVersion(): boolean {
        const useMono = Capabilities.config.get<boolean>(Config.UseMono);
        let monoBinary = Capabilities.config.get<string>(Config.MonoPath);
        if (!monoBinary) {
            monoBinary = "mono";
        }

        if (os.platform() === EnvironmentConfig.Win32 && !useMono) {
            // Sadly, it is not easy to find out the .NET-version on Windows.
            // We assume that a supported Windows Version has a recent enough .NET version preinstalled.
            // See https://docs.microsoft.com/en-us/windows/desktop/api/winnt/ns-winnt-_osversioninfoa
            // and https://docs.microsoft.com/en-us/dotnet/framework/migration-guide/how-to-determine-which-versions-are-installed
            return true;
        }

        try {
            const monoVersionOutput = execFileSync(monoBinary, ["--version"]);
            const monoVersion = /compiler version (\d+)\.(\d+)\.(\d+)/i
                .exec(monoVersionOutput)!.slice(1).map((str) => Number(str));

            if (monoVersion.length !== 3 || monoVersion.some((num) => isNaN(num))) {
                log("Mono version could not be parsed from version output.");
                return false;
            }

            return monoVersion[0] >= 4;

        } catch (exeception) {
            log("Mono binary could not be executed.");
            return false;
        }
    }
}

"use strict";

import * as DecompressZip from "decompress-zip";
import { https as redirect } from "follow-redirects";
import * as fs from "fs";
import * as https from "https";
import * as os from "os";
import * as pathHelper from "path";
import * as semver from "semver";
import uri from "vscode-uri";
import { NotificationService } from "../notificationService";
import { EnvironmentConfig, Installer } from "../strings/stringRessources";

export class DafnyInstaller {

    private readonly basePath = this.resolvePath(pathHelper.join(__dirname, "..", "..", "dafny"));
    private readonly downloadFile = this.resolvePath(pathHelper.join(this.basePath, "..", "dafny.zip"));

    constructor(private notificationService: NotificationService) {
    }

    public async latestVersionInstalled(localVersion: string): Promise<boolean> {
        try {
            const json = await this.getReleaseInformation();
            const localVersionSemVer = localVersion.match(/(\d+\.\d+\.\d+)/);
            if (json && json.name) {
                const latestVersion = json.name; // semver ignores leading v
                const latestVersionSemVer = latestVersion.match(/(\d+\.\d+\.\d+)/);
                if (localVersionSemVer != null && latestVersionSemVer != null) {
                    console.log("Local: " + localVersionSemVer[0]);
                    console.log("Remote:" + latestVersionSemVer[0]);
                    return semver.gte(localVersionSemVer[0], latestVersionSemVer[0]);
                } else {
                    console.log("Can't parse version numbers");
                    return Promise.reject(false);
                }
            } else {
                throw new Error("Could not read dafny version from JSON");
            }
        } catch (e) {
            console.log("Can't get release information: " + e);
            return Promise.reject(false);
        }
    }

    public getReleaseInformation(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const options: https.RequestOptions = {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0",
                },
                host: uri.parse(Installer.ReleaseUrl).authority,
                path: uri.parse(Installer.ReleaseUrl).path,
            };

            https.get(options, (res) => {
                let body = "";

                res.on("data", (chunk) => {
                    body += chunk;
                });

                res.on("end", () => {
                    try {
                        const json = JSON.parse(body);
                        resolve(json);
                    } catch (e) {
                        console.log("Could not parse Dafny release information JSON");
                        reject();
                    }
                });
            }).on("error", (e) => {
                console.error(e);
                return reject(e);
            });
        });
    }

    public downloadRelease(json: any): Promise<boolean> {
        if (!json || !json.assets) {
            const msg = "Could not get Dafny Release assets from JSON response.";
            console.log(msg);
            return Promise.reject(msg);
        }

        let platform;
        switch (os.platform()) {
            case EnvironmentConfig.Win32:
                platform = "win";
                break;
            case EnvironmentConfig.OSX:
                platform = "osx";
                break;
            case EnvironmentConfig.Ubuntu:
                platform = "ubuntu";
                break;
        }
        if (!platform) {
            return Promise.reject(`Unsupported platform: "${os.platform()}"`);
        }

        const url = this.getReleaseUrl(json.assets, platform);
        if (!url) {
            return Promise.reject(`Could not find dafny release for platform "${platform}"`);
        }

        return this.download(url, this.downloadFile);
    }

    public prepareDafny(): Promise<string> {

        if (os.platform() !== EnvironmentConfig.Win32) {
            fs.chmodSync(pathHelper.join(this.basePath, "dafny", "z3", "bin", "z3"), "755");
            fs.chmodSync(pathHelper.join(this.basePath, "dafny", "DafnyServer.exe"), "755");
            fs.chmodSync(pathHelper.join(this.basePath, "dafny", "Dafny.exe"), "755");
        }

        fs.unlink(this.downloadFile, (err) => {
            if (err) {
                console.error("Error deleting archive: " + err);
            }
        });
        console.log("prepared dafny");

        return Promise.resolve(pathHelper.join(this.basePath, "dafny"));
    }

    public async install(): Promise<string> {
        this.notificationService.progressText("Fetching GitHub release data");
        try {
            const json = await this.getReleaseInformation();
            await this.downloadRelease(json);
            await this.extract(this.downloadFile);
            return this.prepareDafny();
        } catch (e) {
            console.error(e);
            return Promise.reject(e);
        }
    }

    public uninstall(): void {
        const path = this.basePath;
        if (path && path.length > 10) {
            console.log("remove " + path);
            this.deleteFolderRecursive(path);
        }
    }

    private resolvePath(str: string) {
        if (str.substr(0, 2) === "~/") {
            str = (process.env.HOME || process.env.HOMEPATH || process.env.HOMEDIR || process.cwd()) + str.substr(1);
        }
        return pathHelper.resolve(str);
    }

    private getReleaseUrl(assets: any[], platform: string): string | undefined {
        for (const asset of assets) {
            if (asset.name.indexOf(platform) !== -1) {
                return asset.browser_download_url;
            }
        }
        return undefined;
    }

    private deleteFolderRecursive(path: string) {
        this.notificationService.progressText("Removing existing files");
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file) => {
                const curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    this.deleteFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    }

    private download(url: string, filePath: string): Promise<boolean> {
        return new Promise<any>((resolve, reject) => {
            try {
                this.notificationService.startProgress();
                const options: https.RequestOptions = {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0",
                    },
                    host: uri.parse(url).authority,
                    path: uri.parse(url).path,
                };

                const file = fs.createWriteStream(filePath);
                const request = redirect.get(options, (response: any) => {
                    response.pipe(file);

                    const len = parseInt(response.headers["content-length"], 10);
                    let cur = 0;
                    response.on("data", (chunk: string) => {
                        cur += chunk.length;
                        this.notificationService.progress("Downloading Dafny ", cur, len);
                    });

                    file.on("finish", () => {
                        file.close();
                        return resolve(true);
                    });
                });
                request.on("error", (err: Error) => {
                    fs.unlink(filePath);
                    throw err;
                });
            } catch (e) {
                console.error("Error downloading dafny: " + e);
                return reject(false);
            }
        });

    }

    private extract(filePath: string): Promise<boolean> {
        return new Promise<any>((resolve, reject) => {
            try {
                console.log("Extracting files...");
                this.notificationService.startProgress();

                const unzipper = new DecompressZip(filePath);

                unzipper.on("progress", (fileIndex: number, fileCount: number) => {
                    this.notificationService.progress("Extracting Dafny ", fileIndex + 1, fileCount);
                });

                unzipper.on("error", (e: any) => {
                    if (e.code && e.code === "ENOENT") {
                        console.error("Error updating Dafny, missing create file permission in the dafny directory: " + e);
                    } else if (e.code && e.code === "EACCES") {
                        console.error("Error extracting " + filePath + ": " + e + " | " + e.message);
                    } else {
                        console.error("Error extracting " + filePath + ": " + e);
                    }
                    return reject(e);
                });

                unzipper.on("extract", () => {
                    return resolve();
                });

                if (!fs.existsSync(this.basePath)) {
                    fs.mkdirSync(this.basePath);
                }
                unzipper.extract({
                    filter: (file: any) => file.type !== "SymbolicLink",
                    path: this.basePath,
                });
            } catch (e) {
                console.error("Error extracting dafny: " + e);
                return reject(false);
            }
        });

    }

}

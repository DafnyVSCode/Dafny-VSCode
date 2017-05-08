"use strict";

import * as https from "https";
const redirect = require("follow-redirects").https;
import * as fs from "fs";
import * as os from "os";
import uri from "vscode-uri";
import { DafnyUnsupportedPlatform } from "../errorHandling/errors";
import { Config, EnvironmentConfig, InfoMsg, Installer } from "../strings/stringRessources";
import { DafnySettings } from "./dafnySettings";
const DecompressZip = require("decompress-zip");
const semver = require("semver");
import * as pathHelper from "path";

export class DafnyInstaller {

    private basePath = this.resolvePath("~/.dafny");
    private downloadFile = this.resolvePath("~/dafny.zip");

    constructor(private dafnySettings: DafnySettings) {
    }

    public latestVersionInstalled(localVersion: string): Promise<boolean> {
        return this.getReleaseInformation().then((json) => {

            if (json && json.length > 0 && json[0].name) {
                const latestVersion = json[0].name; //semver ignores leading v
                console.log("Local: " + localVersion);
                console.log("Remote:" + latestVersion);
                return semver.gte(localVersion, latestVersion);
            } else {
                console.log("cant get release information");
                return Promise.reject(false);
            }

        }, (e) => {
            console.log("cant get release information1: " + e);
            return Promise.reject(false);
        });
    }

    public getReleaseInformation(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const options: https.RequestOptions = {
                host: uri.parse(Installer.ReleaseUrl).authority,
                path: uri.parse(Installer.ReleaseUrl).path,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0"
                }
            };

            https.get(options, (res) => {
                let body = "";

                res.on("data", (chunk) => {
                    body += chunk;
                });

                res.on("end", () => {
                    const json = JSON.parse(body);
                    return resolve(json);
                });
            }).on("error", (e) => {
                console.error(e);
                return reject(e);
            });
        });
    }

    public downloadRelease(json: any): Promise<boolean> {
        if (json && json.length > 0 && json[0].assets) {

            const assets = json[0].assets;
            let url = "";

            if (os.platform() === EnvironmentConfig.Win32) {
                url = this.getReleaseUrl(assets, "win");
            } else if (os.platform() === EnvironmentConfig.OSX) {
                url = this.getReleaseUrl(assets, "osx");
            } else if (os.platform() === EnvironmentConfig.Ubuntu) {
                url = this.getReleaseUrl(assets, "ubuntu");
            }

            if (url === null) {
                return Promise.reject("Unsupported platform: " + os.platform());
            }

            return this.download(url, this.downloadFile);
        } else {
            console.log("cant get release information2");
            return Promise.reject("cant get release information2");
        }
    }

    public prepareDafny(): Promise<string> {
        //console.log("Extracting ViperTools finished " + (success ? "" : "un") + "successfully"/*, LogLevel.Info*/);

        //chmod to allow the execution of ng and zg files
        if (os.platform() !== EnvironmentConfig.Win32) {
            fs.chmodSync(pathHelper.join(this.basePath, "z3", "bin", "z3"), "755");
            fs.chmodSync(pathHelper.join(this.basePath, "DafnyServer.exe"), "755");
            fs.chmodSync(pathHelper.join(this.basePath, "Dafny.exe"), "755");
        }

        //delete archive
        fs.unlink(this.downloadFile, (err) => {
            if (err) {
                console.error("Error deleting archive after ViperToolsUpdate: " + err);
            }
            //Server.connection.sendNotification(Commands.ViperUpdateComplete, true);//success
        });
        //trigger a restart of the backend
        //Settings.initiateBackendRestartIfNeeded(null, null, true);
        console.log("prepared dafny")

        return Promise.resolve(pathHelper.join(this.basePath, "dafny"));
    }

    public install(): Promise<string> {
        return this.getReleaseInformation().then((json) => {
            return this.downloadRelease(json).then(() => {
                return this.extract(this.downloadFile).then(() => {
                    return this.prepareDafny();
                });
            });
        }).catch(e => {
            console.error(e);
            return Promise.reject(e);
            //Server.connection.sendNotification(Commands.ViperUpdateComplete, false);//update failed
        });
    }

    public uninstall(showUninstallMessage: boolean = true): void {
        console.log("remove " + this.basePath);
        this.deleteFolderRecursive(this.basePath);
    }

    private resolvePath(str: string) {
        if (str.substr(0, 2) === "~/") {
            str = (process.env.HOME || process.env.HOMEPATH || process.env.HOMEDIR || process.cwd()) + str.substr(1);
        }
        return pathHelper.resolve(str);
    }

    private getReleaseUrl(assets: any, platform: string): string {
        for (let i = 0; i < assets.length; i++) {
            if (assets[i].name.indexOf(platform) !== -1) {
                return assets[i].browser_download_url;
            }
        }
        return null;
    }


    private deleteFolderRecursive(path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file, index) => {
                const curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    this.deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    };

    private download(url, filePath): Promise<boolean> {
        console.log("downloading: " + url);
        return new Promise<any>((resolve, reject) => {
            try {
                //console.startProgress();
                const options: https.RequestOptions = {
                    host: uri.parse(url).authority,
                    path: uri.parse(url).path,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0"
                    }
                };

                const file = fs.createWriteStream(filePath);
                const request = redirect.get(options, (response) => {
                    response.pipe(file);

                    //download progress 
                    let len = parseInt(response.headers["content-length"], 10);
                    let cur = 0;
                    response.on("data", (chunk) => {
                        cur += chunk.length;
                        //console.progress("Download Viper Tools", cur, len, LogLevel.Debug);
                    });

                    file.on("finish", () => {
                        file.close();
                        return resolve(true);
                    });
                    request.on("error", (err) => {
                        fs.unlink(filePath);
                        console.error("Error downloading viper tools: " + err.message);
                        return reject(false);
                    });
                });
            } catch (e) {
                console.error("Error downloading viper tools: " + e);
                return reject(false);
            }
        });

    };

    private extract(filePath: string): Promise<boolean> {
        return new Promise<any>((resolve, reject) => {
            try {
                //extract files
                console.log("Extracting files..."/*, LogLevel.Info*/)
                //console.startProgress();

                let unzipper = new DecompressZip(filePath);

                unzipper.on("progress", function (fileIndex, fileCount) {
                    //console.progress("Extracting Viper Tools", fileIndex + 1, fileCount, LogLevel.Debug);
                    //console.log("Extracting Viper Tools" + (fileIndex + 1) + " " + fileCount);
                });

                unzipper.on("error", (e) => {
                    if (e.code && e.code == "ENOENT") {
                        console.error("Error updating the Viper Tools, missing create file permission in the viper tools directory: " + e);
                    } else if (e.code && e.code == "EACCES") {
                        console.error("Error extracting " + filePath + ": " + e + " | " + e.message);
                    } else {
                        console.error("Error extracting " + filePath + ": " + e);
                    }
                    return reject(e);
                });

                unzipper.on("extract", (log) => {
                    return resolve();
                });

                if (!fs.existsSync(this.basePath)) {
                    fs.mkdirSync(this.basePath);
                }
                unzipper.extract({
                    path: this.basePath,
                    filter: (file) => {
                        return file.type !== "SymbolicLink";
                    }
                });
            } catch (e) {
                console.error("Error extracting viper tools: " + e);
                return reject(false);
            }
        });

    }

}

# Dafny 2 VSCode (Legacy) [![Marketplace Downloads Count](https://vsmarketplacebadge.apphb.com/installs-short/correctnessLab.dafny-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=correctnessLab.dafny-vscode)

⚠ This plugin targets Dafny 2 and is deprecated. Consider switching to its [successor](https://marketplace.visualstudio.com/items?itemName=correctnessLab.dafny-vscode-preview) that supports Dafny 3.0.0.

> This repository contains the infrastructure necessary to support _Dafny_ for Visual Studio Code.

To add Dafny to VSCode, please go to the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=correctnessLab.dafny-vscode).

| master | develop |
| --- | --- |
|[![Build Status](https://travis-ci.com/DafnyVSCode/Dafny-VSCode.svg?branch=master)](https://travis-ci.com/DafnyVSCode/Dafny-VSCode)<br>[![VSCode Marketplace](https://vsmarketplacebadge.apphb.com/version-short/correctnessLab.dafny-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=correctnessLab.dafny-vscode)|[![Build Status](https://travis-ci.com/DafnyVSCode/Dafny-VSCode.svg?branch=develop)](https://travis-ci.com/DafnyVSCode/Dafny-VSCode)<br>[![Sounarcloud](https://sonarcloud.io/api/project_badges/measure?project=dafny-vscode_1337&metric=alert_status)](https://sonarcloud.io/dashboard?id=dafny-vscode_1337) |



## Architecture

The infrastructure consists of a _Dafny_ language server, which can be found in the [server](server/) directory, and a VS Code extension, which in turn can be found in the [client](client/) directory. These components communicate with each other using the [_Language Server Protocol (LSP)_](https://microsoft.github.io/language-server-protocol/).

![Dafny VSode Architecture](https://plantuml.dev.ifs.hsr.ch/svg/RP11Yy8m48NFpgyOwaL1R-9XaLxgfKjPPUDw4Gyn7KkWJSeqBfHb_xknZLN4EMNclNnl4cDpmgJKP1mUO7MAr_9iMjoBv250w7vIJ8qZbiffQsQOYUtTiTBnhgr9ADQrWoEOcryG_nA_mVO2VDFPeonhKpGzBGYlD5NQIuuzuWz67RphXWJqDRh710g6sh8jM5QLT5e5I9AbW-p3al7GTOSZ_0E4JvdFux3M1qQPDCL55iFJFDfPPSi8mk3cVjh1N_6McZKvoUqC9vLjNDbEyIGRMYxmKso-eYi0)

## Contribute

We welcome all contributions! Please create a pull request and we will take care of releasing a new version when appropriate.

### How-To

#### Setup

It is pretty simple to contribute to this plugin.
All it takes is having Visual Studio Code and npm installed.
Simply clone this repository and switch into the new folder. On the command line, execute one of the following scripts:

* Linux & macOS: `scripts/dev-env.bash`
* Windows: `scripts\dev-env.bat`

These scripts install node dependencies and start `code` for both the server and client.

If all the commands succeeded, the language server part and the client part of the plugin are opened in two different Visual Studio Code editors and installs all the dependencies.

> 🛈 It is necessary that the `code` command is available in your `PATH`. On the Mac, this is usually not given.
> If it is missing, have a look at this [tutorial](https://code.visualstudio.com/docs/setup/mac).

> ⚠️ Having the extension installed via the Visual Studio Marketplace (along with a _Dafny_ installation via the extension), can lead to conflicts with your locally built extension.
> It is therefore recommended to uninstall all previous installations of the extension from Visual Studio Code.

#### Compile

In the server editor, press `CTRL+Shift+b` or `⇧+⌘+B` to compile. The task that is started also watches file changes and recompiles automatically after saving.

To try out the changes, go to the client editor and press `F5`.
A new instance of Visual Studio Code will be started that has the Dafny plugin running and ready for testing.
Sometimes, Visual Studio Code does not recognize changes and does not apply them to the running test instance.
If this is the case, simply close and restart the test instance, the changes should then be applied.

#### Tests and Linting

Make sure that your changes don't break the existing tests in the client/test folder.
You can run the tests with `npm test` while in the client folder.
For this to work, you have to set environment variable `DAFNY_PATH` on your system to your _Dafny_ release (without a "/" at the end of the path).

Alternatively, you can execute tests with docker (Linux & macOS only) using `scripts/test-docker.bash`.

If you add new features, please make sure to include unit tests to cover as much code as possible.

To get some code-consistency, we check against tslint in all automated builds. Please check that your client and server complies: `tslint --project .`.

### Release

To release a new version of Dafny VSCode, follow the description in [RELEASE.md](RELEASE.md).

## License

Dafny VSCode is released under the [MIT License](https://github.com/DafnyVSCode/Dafny-VSCode/blob/develop/LICENSE).
Note that by submitting a Pull Request, you agree to release your changes under this license.

### Contributors

* [@ferry-](https://github.com/ferry-)
* [@markusschaden](https://github.com/markusschaden)
* [@ValisStigma](https://github.com/ValisStigma)
* [@wilcoxjay](https://github.com/wilcoxjay)
* [@RustanLeino](https://github.com/RustanLeino)
* [@GoryMoon](https://github.com/GoryMoon)
* [@jamesbornholt](https://github.com/jamesbornholt)
* [@fmehta](https://github.com/fmehta)
* [@misto](https://github.com/misto)
* [@pipeaesac](https://github.com/pipeaesac)
* [@fabianhauser](https://github.com/fabianhauser)
* [@ssaavedra](https://github.com/ssaavedra)
* [@saltiniroberto](https://github.com/saltiniroberto)
* [@nhweston](https://github.com/nhweston)
* [@kailingP](https://github.com/kailingP)

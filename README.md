# dafny-vscode
Dafny support for Visual Studio Code.


## Features
* Provides .dfy language id to vscode.
* Spawns a DafnyServer in the background and sends veification requests upon opening and saving Dafny files.
* Errors, warnings and hints are shown through the vscode interface. When there are no errors, you get a thumbup on the status bar.
* Syntax highlighting thanks to [sublime-dafny](https://github.com/erggo/sublime-dafny). See file `LICENSE_sublime-dafny.rst` for license. 
* Left hand side status bar item provides information about the current file.
* Right hand size status bar item relates to the state of the DafnyServer.

![assertions animation](example.gif)

## Requirements - Installation guide
* A C# runtime to run DafnyServer. Mono should be supported on all platforms that vscode runs on. On windows, you may also use .net - see config below.
* [Binary dafny distribution](https://github.com/Microsoft/dafny/releases), which contains `DafnyServer.exe` and its dependencies - path must be specified in config.
* The path to the `DafnyServer.exe` set in the user configuration as `dafny.dafnyServerPath` (see the `File` menu on Windows and GNU+Linux, `Code` menu on OSX).

## Extension Settings

The following are necessary:

* `dafny.dafnyServerPath`: absolute `DafnyServer.exe` path.

The following are optional:

* `dafny.monoPath`: Absolute path to `mono` binary. Only required if `mono` isn't found in PATH (you'll get an error if that's the case).
* `dafny.useMono`: Only applicable to Windows; requires .net 4.0 or higher when false. Attempts to launch dafny process directly when set to false 

[//]: # "* `dafny.automaticVerification`: Verify as soon as the document is changed (default). When false, only verify on save."
[//]: # "* `dafny.automaticVerificationDelayMS`: Delay to wait after a document change before actually sending a verification request. This is done to avoid * getting syntax errors as one is typing. Only relevant when automaticVerification is true."


## Release Notes
* 0.2.0: Full refactoring of the plugin. issues/3 from ferry~ fixed. 
* 0.1.2: Refactored/tweaked UI code, Added `dafny.restartDafnyServer` ("Restart Dafny Server") command.
* 0.1.0: Added syntax highlighting, tested on Ubuntu and OSX.
* 0.0.3: Getting `mono` from PATH when `monoPath` isn't set.
* 0.0.2: Fixed readme and license, added use animation.
* 0.0.1: Initial release, some half baked features turned off.


## TODO
* add restart server action.
* atomatic verification as one types (with 'deboucing' waiting period).
* (DONE) syntax highlighting (see if you can adapt sublime-dafny).
* context aware suggestiions.
* full context awareness, code completion.

## COMING SOON
* automatic download of dafny executables and configuration

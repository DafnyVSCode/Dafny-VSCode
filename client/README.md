# dafny-vscode
Dafny support for Visual Studio Code.

## Features
* **NEW** IntelliSense for classes
* **NEW** Compile and Run dfy file
* Update notification if there is a newer release of Dafny. 
* CodeLens showing method references
* DafnyDefinition provider to support refactorings in the future 
* Automatic verification as one types, 
* Automatic installation of DafnyServer (windows, osx and ubuntu)
* Provides .dfy language support to vscode.
* Spawns a DafnyServer in the background and sends veification requests upon opening and saving Dafny files.
* Errors, warnings and hints are shown through the vscode interface. When there are no errors, you get a thumbup on the status bar.
* Syntax highlighting thanks to [sublime-dafny](https://github.com/erggo/sublime-dafny). See file `LICENSE_sublime-dafny.rst` for license. 
* Left hand side status bar item provides information about the current file.
* Right hand size status bar item relates to the state of the DafnyServer.

![assertions animation](example.gif)

## Shortcuts

* `Ctrl+Shift+B` or `⇧⌘B` Compile dfy file to dll or exe, if there is a Main method
* `F5` Compile and Run if it has a Main method. 

## Tasks
* `Install DafnyServer` Download and install the dafnyserver and sets the dafny.dafnyServerPath accordingly
* `Uninstall DafnyServer` Uninstalls the DafnyServer
* `Restart DafnyServer` Restart the DafnyServer

## Requirements - Installation guide
* Automatic Installation Requirements: `curl` or `wget` on osx and ubuntu. `PowerShell V5` on Windows
* A C# runtime to run DafnyServer. Mono should be supported on all platforms that vscode runs on. On windows, you can also use .net.
* [Binary dafny distribution](https://github.com/FunctionalCorrectness/dafny-microsoft/releases), which contains `DafnyServer.exe` and its dependencies. **This and next releases will use a own release of Dafny to support more features, like Refactorings**
* The path to the `DafnyServer.exe` set in the user configuration as `dafny.dafnyServerPath` (see the `File` menu on Windows and GNU+Linux, `Code` menu on OSX).


## Extension Settings

The following are necessary:

* `dafny.basePath`: absolute path to the **Dafny Directory**. 

The following are optional:

* `dafny.monoPath`: Absolute path to `mono` binary. Only required if `mono` isn't found in PATH (you'll get an error if that's the case).

* `dafny.useMono`: Only applicable to Windows; requires .net 4.0 or higher when false. Attempts to launch dafny process directly when set to false 

* `dafny.automaticVerification`: Verify as soon as the document is changed (default). When false, only verify on save.

* `dafny.automaticVerificationDelayMS`: Delay to wait after a document change before actually sending a verification request. This is done to avoid getting syntax errors as one is typing. Only relevant when automaticVerification is true.


## Release Notes
* 0.9.0 Switched to Language Server. IntelliSense for classes, compile and execute Dafny program in VSCode. QuickFix for decrease, increase and object may be null. 
* 0.8.0 CodeLens showing method references, Go to Definition, version checking for newer Dafny release. 
* 0.6.0 DafnyDef allows to get SymbolInformation from DafnyServer, which will allow in the future to implement Refactorings. Go to Definition is already implemented. 
* 0.5.5 Fallback to wget, if curl is not found.
* 0.5.4 Automatic validation as you type.  
* 0.5.1 Smaller bugfixes. 
* 0.5.0: Automatic download and installation task on osx and ubuntu `dafny.installDafny`. Also added uninstaller `dafny.uninstallDafny`. 
* 0.4.4: Uninstall task of dafny on windows. 
* 0.4.0: Automatic download and installation task on windows. 
* 0.2.0: Full refactoring of the plugin. issues/3 from ferry~ fixed. 
* 0.1.2: Refactored/tweaked UI code, Added `dafny.restartDafnyServer` ("Restart Dafny Server") command.
* 0.1.0: Added syntax highlighting, tested on Ubuntu and OSX.
* 0.0.3: Getting `mono` from PATH when `monoPath` isn't set.
* 0.0.2: Fixed readme and license, added use animation.
* 0.0.1: Initial release, some half baked features turned off.




[![Analytics](https://ga-beacon.appspot.com/UA-98083145-1/FunctionalCorrectness/dafny-vscode?pixel)](https://github.com/FunctionalCorrectness/dafny-vscode)

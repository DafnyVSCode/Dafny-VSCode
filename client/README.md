# Dafny-VSCode

Dafny support for Visual Studio Code.

## Features

* **NEW** Warning if the Dafny Plugin is used without a workspace. Can cause features to not work correctly. 
* **NEW** Context Menu for most commands. 
* **NEW** CounterExamples are not shown directly anymore, because of performance issues. You still can dafny.automaticShowCounterModel to true or use `F7`. 
* Display counter example for failing proof (requires Dafny +1.9.15)
* IntelliSense for classes
* Compile and Run dfy file
* Update notification if there is a newer release of Dafny. 
* CodeLens showing method references
* DafnyDefinition provider to support refactorings in the future 
* Automatic verification as one types 
* Automatic installation of Dafny
* Provides .dfy language support to vscode.
* Spawns a DafnyServer in the background and sends veification requests upon opening and saving Dafny files.
* Errors, warnings and hints are shown through the vscode interface. When there are no errors, you get a thumbup on the status bar.
* Syntax highlighting thanks to [sublime-dafny](https://github.com/erggo/sublime-dafny). See file `LICENSE_sublime-dafny.rst` for license. 
* Left hand side status bar item provides information about the current file.
* Right hand size status bar item relates to the state of the DafnyServer.

![assertions animation](simpleassert.gif)

More examples at the end...

## Shortcuts

| Shortcut                  | Description                                                          |
| :------------------------ |:-------------------------------------------------------------------- | 
| `Ctrl+Shift+B` or `⇧+⌘+B` | Compile `.dfy` file to `.dll` or `.exe`, if there is a `Main` method |
| `F5`                      | Compile and run, if the source file has a `Main` method              |
| `F6`                      | Show flow graph                                                      |
| `F7`                      | Show CounterExample                                                  |
| `F8`                      | Hide CounterExample                                                  |

## Tasks

Choose `Tasks -> Run Task...` to run one of the following:

| Task                    | Description                                                                           |
| :---------------------- |:------------------------------------------------------------------------------------- | 
| `Install DafnyServer`   | Downloads and installs the DafnyServer and sets the dafny.dafnyServerPath accordingly |
| `Uninstall DafnyServer` | Uninstalls the DafnyServer                                                            |
| `Restart DafnyServer`   | Restarts the DafnyServer                                                              |

## Requirements - Installation guide
* A C# runtime to run DafnyServer. Mono should be supported on all platforms that vscode runs on. On windows, you can also use .net.
* [Binary dafny distribution](https://github.com/FunctionalCorrectness/dafny-microsoft/releases), which contains `DafnyServer.exe` and its dependencies. **This and next releases will use a own release of Dafny to support more features, like Refactorings**

## Extension Settings

The following are necessary:

| Setting          | Description                              |
| :--------------- |:---------------------------------------- |
| `dafny.basePath` | Absolute path to the **Dafny Directory** |

The following are optional:

| Setting          | Description                              |
| :--------------- |:---------------------------------------- |
| `dafny.monoPath` | Absolute path to `mono` binary. Only required if `mono` isn't found in PATH (you'll get an error if that's the case). |
| `dafny.useMono` | Only applicable to Windows! Requires .net 4.0 or higher when set to false. Attempts to launch dafny process directly, when set to false. |
| `dafny.automaticVerification` | Verify as soon as the document is changed (default). When false, only verify on save. |
| `dafny.automaticVerificationDelayMS` | Delay to wait after a document change before actually sending a verification request. This is done to avoid getting syntax errors as one is typing. Only relevant when automaticVerification is true. |
| `dafny.automaticShowCounterModel` | Show CounterModel automatically if a proof fails. Can cause performance issues. |

## Examples

### Installation
On the first start the plugin asks you to install Dafny automatically. 

![assertions animation](installation.gif)

### Add null check
Some diagnostics can be directly inserted with a quickfix at the beginning of a line.

![assertions animation](addnullcheck.gif)

### Compile and Run
Pressed `F5` to compile and run the program.

![assertions animation](compileandrun.gif)

### CounterExample
Pressed `F7` to show counterexamples.

![assertions animation](counterexample.gif)

[![Analytics](https://ga-beacon.appspot.com/UA-98083145-1/FunctionalCorrectness/dafny-vscode?pixel)](https://github.com/FunctionalCorrectness/dafny-vscode)

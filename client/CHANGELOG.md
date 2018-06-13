# Release Notes

## 0.12.0
The Dafny base path can now alternatively be set via the environment variable DAFNY_PATH.

## 0.11.1 
Use Dafny releases from Microsoft/dafny. Miscellaneous bug fixes.

## 0.10.10
BugFix: Decrease guard

## 0.10.9
BugFix: Rename method

## 0.10.8
Warning if no workspace is used
Changelog 

## 0.10.7 
BugFix Ubuntu

## 0.10.2 
Added Context Menu Commands

## 0.10.1 
Manually show counterexample, flow graph

## 0.10.0 
Display counter example for failing proof. Switched to typescript implementation to download dependencies. Lots of bugfixes

## 0.9.0 
Switched to Language Server. IntelliSense for classes, compile and execute Dafny program in VSCode. QuickFix for decrease, increase and object may be null. 

## 0.8.0 
CodeLens showing method references, Go to Definition, version checking for newer Dafny release. 

## 0.6.0 
DafnyDef allows to get SymbolInformation from DafnyServer, which will allow in the future to implement Refactorings. Go to Definition is already implemented. 

## 0.5.5 
Fallback to wget, if curl is not found.

## 0.5.4 
Automatic validation as you type.  

## 0.5.1 
Smaller bugfixes. 

## 0.5.0
Automatic download and installation task on osx and ubuntu `dafny.installDafny`. Also added uninstaller `dafny.uninstallDafny`. 

## 0.4.4
Uninstall task of dafny on windows. 

## 0.4.0
Automatic download and installation task on windows. 

## 0.2.0
Full refactoring of the plugin. issues/3 from ferry~ fixed. 

## 0.1.2
Refactored/tweaked UI code, Added `dafny.restartDafnyServer` ("Restart Dafny Server") command.

## 0.1.0
Added syntax highlighting, tested on Ubuntu and OSX.

## 0.0.3
Getting `mono` from PATH when `monoPath` isn't set.

## 0.0.2
Fixed readme and license, added use animation.

## 0.0.1
Initial release, some half baked features turned off.

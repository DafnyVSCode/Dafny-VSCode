@echo off
rem
rem ************************************************
rem * STARTUP DAFNY VSCODE DEVELOPMENT ENVIRONMENT *
rem ************************************************
rem
rem Installing server ...
rem

cd server
npm install
code .

rem
rem Installing client ...
rem

cd ..\client
npm install
code .

cd ..

rem
rem DONE!
rem
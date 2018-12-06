@echo off

echo( 
echo ************************************************
echo * STARTUP DAFNY VSCODE DEVELOPMENT ENVIRONMENT *
echo ************************************************
echo( 

echo Installing server ...
echo(

cd %~dp0\..\server
call npm install
call code .

echo(
echo Installing client ...
echo(

cd ..\client
call npm install
call code .

cd ..

echo(
echo DONE!
echo(

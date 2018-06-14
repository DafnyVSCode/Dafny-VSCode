echo/
echo ************************************************
echo * STARTUP DAFNY VSCODE DEVELOPMENT ENVIRONMENT *
echo ************************************************
echo/
echo Installing server ...
echo/

cd server
npm install
code .

echo/
echo Installing client ...
echo/

cd ..\client
npm install
code .

echo/
echo DONE!
echo/
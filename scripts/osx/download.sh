#!/bin/bash

version_url="https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/version.txt"

dafny_osx_url="https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/osx.txt"

cd ~
mkdir -p ".Dafny"
cd .Dafny
if hash curl 2>/dev/null; then
    dafny_url=$(curl $dafny_osx_url)
    echo $dafny_url
    curl -L -o "DafnyOSX.zip" $dafny_url
else
    dafny_url="`wget -qO- $dafny_osx_url`"
    echo $dafny_url
    wget -O "DafnyOSX.zip" $dafny_url
fi
unzip "DafnyOSX.zip"

kill -9 $PPID
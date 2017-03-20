#!/bin/bash

version_url="https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/version.txt"

dafny_ubuntu_url="https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/ubuntu.txt"

cd ~
mkdir -p ".Dafny"
cd .Dafny
if hash curl 2>/dev/null; then
    dafny_url=$(curl $dafny_ubuntu_url)
    echo $dafny_url
    curl -L -o "DafnyUbuntu.zip" $dafny_url
else
    dafny_url="`wget -qO- $dafny_ubuntu_url`"
    echo $dafny_url
    wget -O "DafnyUbuntu.zip" $dafny_url
fi


unzip "DafnyUbuntu.zip"

kill -9 $PPID
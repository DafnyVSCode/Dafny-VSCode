#!/bin/bash

version_url="https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/version.txt"

dafny_ubuntu_url="https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/ubuntu.txt"

dafny_url=$(curl $dafny_ubuntu_url)
echo $dafny_url

cd ~
mkdir -p ".Dafny"
cd .Dafny
curl -L -o "DafnyUbuntu.zip" $dafny_url

unzip "DafnyUbuntu.zip"

kill -9 $PPID
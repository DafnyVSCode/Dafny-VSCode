#!/bin/bash

version_url="https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/version.txt"

dafny_ubuntu_url="https://raw.githubusercontent.com/FunctionalCorrectness/Dafny/master/ubuntu.txt"

dafny_url="`wget -qO- $dafny_ubuntu_url`"
echo $dafny_url

cd ~
mkdir -p "Downloads/Dafny"
wget -O "Downloads/Dafny/DafnyUbuntu.zip" $dafny_url

unzip "Downloads/Dafny/DafnyUbuntu.zip" -d "Downloads/Dafny/Ubuntu"
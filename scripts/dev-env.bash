#!/usr/bin/env bash

ROOT="`git rev-parse --show-toplevel`/"
cd "$ROOT"

cat << EOF

************************************************
* STARTUP DAFNY VSCODE DEVELOPMENT ENVIRONMENT *
************************************************

Installing server ...

EOF

cd server
npm install
code . &

cat << EOF

Installing client ...

EOF

cd ../client
npm install
code . &

cd ..

cat << EOF

DONE!

EOF

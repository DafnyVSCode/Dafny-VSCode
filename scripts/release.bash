#!/bin/bash
set -e

confirm() {
    echo -en "$@"
    read
}

edit() {
    confirm "$2\n\nPress [ENTER] to open $1."
    "${EDITOR:-vi}" "$1"
}


###############################################################################
# Environment
###############################################################################
ROOT="`git rev-parse --show-toplevel`/"
CUR_BRANCH=`git rev-parse --abbrev-ref HEAD`
CUR_CHANGES=`git status --short | wc -l`

if [ "$CUR_BRANCH" != "develop" ] || [ "$CUR_CHANGES" -gt 0 ]; then
    echo "Current branch is not develop without changes - please make sure that you checked out develop and don't have any changes!"
    exit 1
fi

echo -e "Please make sure you are logged into the FunctionalCorrectness account with permissions to publish.\n"\
     "Execute 'npx vsce login FunctionalCorrectness' manually to do so.\n"\
     "Hint 1: For this to work, you need the proper permissions (manage permissions here: https://marketplace.visualstudio.com/manage/publishers/FunctionalCorrectness?auth_redirect=True)\n"\
     "Hint 2: All the information about publishing extensions can be found here: https://code.visualstudio.com/docs/extensions/publish-extension\n"


###############################################################################
# Release preferences
###############################################################################
read -p "Please insert the version number you would like to release and press [ENTER] (format: major.minor.patch): " RELEASE_VERSION
confirm "The new extension version will be '${RELEASE_VERSION}'. Press [ENTER] to confirm."


###############################################################################
# Main Script
###############################################################################
cd "$ROOT" >/dev/null
pushd server >/dev/null
    echo "Building server..."
    npm version ${RELEASE_VERSION}
    npm install
    npm run compile
popd


pushd client >/dev/null
    echo "Update metafiles..."
    edit README.md "Please check that README.md is still complete.\nNote: this README is shown in the Visual Studio Marketplace. Please check the spelling and formatting."
    edit CHANGELOG.md "Please add all new features etc. to the CHANGELOG. Note: this CHANGELOG is shown in the Visual Studio Marketplace. Please check the spelling and formatting."

    echo "Building client..."
    npm version ${RELEASE_VERSION}
    npm install
    npm run vscode:prepublish


    echo "Running tests with docker..."
    ../scripts/test-docker.bash

    confirm "Please test the plugin manually according to the API Documentation ( https://github.com/DafnyVSCode/apiDocumentation )\nPress [ENTER] to continue after testing."

    confirm "Publishing extension version '${RELEASE_VERSION}'. Press [ENTER] to confirm."
    npx vsce publish ${RELEASE_VERSION}
    echo "The extension was published."
popd

echo "Update repository with release information (commit, tag and push to master)..."
git add client/README.md client/CHANGELOG.md {client,server}/package.json {client,server}/package-lock.json
git commit -m "Update changelog and bump version to ${RELEASE_VERSION}"
git checkout master
git merge develop
git tag v${RELEASE_VERSION}
git push master v${RELEASE_VERSION}
git checkout develop

echo "DONE! Please download and test the extension in code."

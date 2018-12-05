# Release Dafny-VSCode

This file outlines the tasks that need to be done in order to release a new version of the plugin on the VS Code Marketplace.

## Preparations

### Update Documentation

1. Read through and update the following descriptions (if necessary):
  * [README.md](README.md)
  * [client/README.md](client/README.md) (_Note: this README is shown in the Visual Studio Marketplace. Please check the spelling and formatting._)
2. Update the changelog for the plugin:
  * [client/CHANGELOG.md](client/CHANGELOG.md) (_Note: this CHANGELOG is shown in the Visual Studio Marketplace. Please check the spelling and formatting._)
  
### Run Complete Build

Build the server and the client as described in [README.md](README.md).

### Test Locally

1. Run the test suite as described in [README.md](README.md).
2. Manually test the plugin according to the [API Documentation](https://github.com/DafnyVSCode/apiDocumentation).

## Trigger Release

Run the following commands on the `develop`-branch in the `client` folder:

* `npx vsce login FunctionalCorrectness`
* Depending on your changes:
  * `npx vsce publish patch` (if you only committed bug fixes)
  * `npx vsce publish minor` (if you introduced new features)
  * `npx vsce publish major` (if backward compatibility is no longer given)

* Note: This will automatically adjust your _package.json_ file.
* Hint 1: For this to work, you need the proper permissions (manage permissions [here](https://marketplace.visualstudio.com/manage/publishers/FunctionalCorrectness?auth_redirect=True)).
* Hint 2: All the information about publishing extensions can be found [here](https://code.visualstudio.com/docs/extensions/publish-extension).

## Merge into Master and create Tag

* `git add README.md CHANGELOG.md package.json package-lock.json && git commit -m "Update changelog and bump version"`
* `git checkout master && git merge develop`
* Create Tag for the current version: `git tag vX.X.X`
* `git push --all`

## Final Check

Download and try the plugin after publishing was successful.

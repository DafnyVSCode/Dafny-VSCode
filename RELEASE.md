This file outlines the tasks that need to be done in order to release a new version of the plugin on the VS Code Marketplace.

* Read through and possibly update the following descriptions:
  * README.md
  * client/README.md
* Update version numbers in the following places:
  * README.md
  * client/CHANGELOG.md
  * client/README.md
* Update the changelog in the following places:
  * README.md
  * client/CHANGELOG.md
* Build the server and the client as described in [README.md](README.md).
* Run the test suite as described in [README.md](README.md).
* Run the following commands in the root of the repository:
  * `vsce login FunctionalCorrectness`
  * `vsce publish minor`
  * Hint 1: For this to work, you need the proper rights.
  * Hint 2: All the information about publishing extensions can be found [here](https://code.visualstudio.com/docs/extensions/publish-extension).
* Download and try the plugin after publishing was successful.

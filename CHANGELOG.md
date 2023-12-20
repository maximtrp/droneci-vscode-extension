# Change Log

## 2.0.1 - 2023-12-20

- Editing server details is now possible.
- Replaced `getRepos` API call with `selfRepos`. This should fix the extension behavior with restricted Drone CI setups.

## 2.0.0 - 2023-11-10

- Refactored server operations (add, edit, delete, select).
- Fixed server autoselection on extension load.
- Fixed default repo filters behavior.
- Fixed other minor errors.

## 1.6.1 - 2023-11-05

- Added Cancel option to build context menu.
- Improved server deletion.
- Builds view is not collapsed by default now.

## 1.6.0 - 2023-10-26

- Implemented sorting and filtering of repositories.
- First server is autoselected on extension activation.

## 1.5.1 - 2023-08-31

- Implemented autorefresh of repositories after server editing (if an edited server was selected).

## 1.5.0 - 2023-08-24

- Implemented autoselection of the first repo (when choosing a server).

## 1.4.1 - 2023-08-19

- Fixed a bug in updating builds after server selection.

## 1.4.0 - 2023-08-19

- Code cleaned and improved.
- Extension is compatible with web environment now ([vscode.dev](https://vscode.dev)).

## 1.3.0 - 2023-03-19

- Removed context from `activate` method.

## 1.2.3 - 2023-03-14

- Fixed a bug in server items editing.

## 1.2.1 - 2023-03-12

- Server items editing improved.

## 1.2.0 - 2023-03-08

- Builds view has a build → stage → step hierarchy now.
- Added Approve and Decline buttons to stage items in Builds view.
- Improved status icons in Builds view.

## 1.1.0 - 2023-03-07

- Improved error handling.
- Registered commands are now disposed on extension deactivating.
- Date format changed.

## 1.0.1 - 2023-03-05

- Fixed a bug in extension bundling that prevented it from running.

## 1.0.0 - 2023-03-04

- Initial release.
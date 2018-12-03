# Installation

Install the VSCode extension Searchy, then open up your vscode folder and copy provider.js from this repo into the folder (<vscode folder>/extensions/malkomalko.searchy-0.0.2/)

Find and download the ripgrep binaries for your OS, then paste them into (<vscode folder>/extensions/malkomalko.searchy-0.0.2/node_modules/vscode-ripgrep/bin/). Overwrite.

Use ripgrep to pop open search results in new read only document.

## To use

ctrl+shift+p then type searchy.

* `searchy.search` (Searchy - Search) - Pop open a dialog to ask for search term, and open the results in a nice read only document.  This uses ripgrep.

## Requirements

N/A

## Known Issues

N/A

## Release Notes

### 0.0.2

Search hidden files by default

### 0.0.1

Initial release

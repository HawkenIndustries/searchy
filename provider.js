const vscode = require('vscode')
const querystring = require('querystring')
const rgPath = require('vscode-ripgrep').rgPath
const {
  execSync
} = require('child_process')

const rootPath = vscode.workspace.rootPath

const execOpts = {
  cwd: rootPath,
  maxBuffer: 1024 * 1000
}

class SearchyProvider {
  constructor() {
    this.links = []
    this._subscriptions = vscode.workspace.onDidCloseTextDocument(doc => {
      this.links[doc.uri.toString()] = []
    })
  }

  dispose() {
    this._subscriptions.dispose()
  }

  static get scheme() {
    return 'searchy'
  }

  onDidChange() {}

  provideTextDocumentContent(uri) {
    let uriString = uri.toString()
    this.links[uriString] = []
    const params = querystring.parse(uri.query)
    const cmd = params.cmd

    let searchResults = null
    try {
      searchResults = runCommandSync(cmd)

      if (searchResults == null || !searchResults.length) {
        return 'There was an error during your search!'
      }

      let resultsArray = searchResults.toString().split('\n')
      resultsArray = resultsArray.filter((item) => {
        return item != null && item.length > 0
      })
      let resultsByFile = {}
      let lastFormattedLine;

      var addFormattedLine = function(formattedLine) {
        if (!resultsByFile.hasOwnProperty(formattedLine.file)) {
          resultsByFile[formattedLine.file] = [];
        }
        
        resultsByFile[formattedLine.file].push(formattedLine);
      }

      resultsArray.forEach((searchResult) => {
        // let splitLine = searchResult.split(/([^:]+):([^:]+):([^:]+):(.+)/)
        // let fileName = splitLine[1]
        // if (fileName == null || !fileName.length) {
        //   return
        // }
        // if (resultsByFile[fileName] == null) {
        //   resultsByFile[fileName] = []
        // }
        // const formattedLine = formatLine(splitLine)
        // resultsByFile[fileName].push(formattedLine)

        let splitLine = searchResult.match(/(.*?):(\d+):(\d+):(.*)/);
        let formattedLine;
        if (splitLine) {
          formattedLine = formatLine(splitLine)
        } else if (searchResult == '--') {
          if (lastFormattedLine) {
            addFormattedLine({
              file: lastFormattedLine.file,
              seperator: true
            });
          }
        } else {
          let contextLine = searchResult.match(/(.*?)-(\d+)-(.*)/);
          if (contextLine) {
            formattedLine = formatContextLine(contextLine)
          }
        }
        if (formattedLine === undefined) {
          return;
        }
        addFormattedLine(formattedLine);
        lastFormattedLine = formattedLine;
      });

      let sortedFiles = Object.keys(resultsByFile).sort()
      let lineNumber = 1

      let lines = sortedFiles.map((fileName) => {
        lineNumber += 1
        let resultsForFile = resultsByFile[fileName].map((searchResult, index) => {
          lineNumber += 1
          if (searchResult.seperator) {
            return '  ..';
          } else {
            this.createDocumentLink(searchResult, lineNumber, cmd, uriString)
            return `  ${searchResult.line}: ${searchResult.result}`
          }
        }).join('\n')
        lineNumber += 1
        return `
file://${rootPath}/${fileName}
${resultsForFile}`
      })
      let header = [`${resultsArray.length} search results found`]
      let content = header.concat(lines)

      return content.join('\n')
    } catch (err) {
      return `${err.stack}`
    }
  }

  provideDocumentLinks(document) {
    return this.links[document.uri.toString()]
  }

  createDocumentLink(formattedLine, lineNumber, cmd, docURI) {
    const {
      file,
      line,
      column
    } = formattedLine
    const col = parseInt(column, 10)
    const preamble = `  ${line}:`.length
    const match = formattedLine.result.match(cmd)
    if (match == null) {
      return
    }
    const searchTerm = match[0].length
    const linkRange = new vscode.Range(
      lineNumber,
      preamble + col,
      lineNumber,
      preamble + col + searchTerm
    )
    const uri = vscode.Uri.parse(`file://${rootPath}/${file}#${line}`)
    this.links[docURI].push(new vscode.DocumentLink(linkRange, uri))
  }
}

module.exports = SearchyProvider

function formatLine(splitLine) {
  return {
    file: splitLine[1],
    line: splitLine[2],
    column: splitLine[3],
    result: splitLine[4]
  }
}

function openLink(fileName, line) {
  var params = {
    fileName: fileName,
    line: line
  }
  return encodeURI('command:searchy.openFile?' + JSON.stringify(params))
}

function formatContextLine(splitLine) {
  return {
    file: splitLine[1],
    line: splitLine[2],
    column: undefined,
    result: splitLine[3]
  }
}

function runCommandSync(cmd) {
  let cleanedCommand = cmd.replace(/"/g, "\\\"")
  return execSync(`${rgPath} --case-sensitive --line-number --column --hidden --context 2 -e "${cleanedCommand}"`, execOpts)
}
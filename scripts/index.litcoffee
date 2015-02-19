# CHTN Vocabulary Builder

Builds JSON, JSON-LD, and SQL representations of the CHTN Vocabulary from the tabular version.

    tabularFileName = "CHTN Vocab-Disease List.txt"
    jsonFileName    = "CHTN Vocab-Disease List.json"
    sqlFileName     = "CHTN Vocab-Disease List.sql"
    jsonldFileName  = "CHTN Vocab-Disease List.jsonld"

## 1) Read in the raw file.
Read in the Tab-Separated version of the vocabulary using [readFileSync][].

    fs = require "fs"
    vocabularyCsv = fs.readFileSync "../#{tabularFileName}", encoding: "utf8"

## 2) Parse JSON
Parse a JSON representation of the vocabulary from the tab-separated version
using [d3's][d3] built-in [CSV parser][d3-csv]. We use [d3][] to reduce the 
number of dependencies; we'll also use it to generate images later.

    d3 = require "d3"
    vocabularyJson = d3.tsv.parse vocabularyCsv
    console.log "Parsed #{tabularFileName} in to #{vocabularyJson.length} rows."

### 2-a) Save the Parsed JSON
We'll save the stringified JSON, pretty-printed with a tab-width of 2.
    
    jsonString = JSON.stringify vocabularyJson, null, 2
    fs.writeFile "../#{jsonFileName}", jsonString, (err) ->
        if err then throw err else console.log "Saved #{jsonFileName}"

## 3) Parse SQL
The SQL representation is parsed from the JSON representation.

    jsonToSql = require "./parsers/jsonToSql"
    jsonToSql vocabularyJson, (err, vocabularySql) ->
        if err then throw err
        fs.writeFile "../#{sqlFileName}", vocabularySql, (err) ->
            if err then throw err else console.log "Saved #{sqlFileName}"

## 4) Parse JSON-LD
The [JSON-LD][] representation is parsed from the JSON representation.

    jsonToJsonld = require "./parsers/jsonToJsonld"
    jsonToJsonld vocabularyJson, (err, vocabularyJsonld) ->
        if err then throw err
        jsonldString = JSON.stringify vocabularyJsonld, null, 2
        fs.writeFile "../#{jsonldFileName}", jsonldString, (err) ->
            if err then throw err else console.log "Saved #{jsonldFileName}"


[readFileSync]: http://nodejs.org/api/fs.html#fs_fs_readfilesync_filename_options "fs.readFileSync documentation"
[d3]: http://d3js.org/ "d3js homepage"
[d3-csv]: https://github.com/mbostock/d3/wiki/CSV "d3.csv documentation"
[JSON-LD]: http://json-ld.org/ "JSON-LD homepage"
# jsonToSql Parser

Parses the JSON representation of the CHTN Vocabulary to SQL.

# 0) Setup

    schemaFile  = "static/chtnVocabularySchema.sql" # location relative to where the process is run
    packageInfo = require "../package.json"         # location relative to where this file lives

    module.exports = (vocabularyJson, callback) ->
        sqlString     = "# CHTN Vocab-Disease List SQL Representation\n"
        sqlString    += "# See #{packageInfo.homepage}\n\n"
        knownEntities = {}
        knownSubsites = {}


# 1) Schema
Read the schema file and add to the `sqlString`

        fs = require "fs"
        schema = fs.readFileSync schemaFile, encoding: "utf8"
        sqlString += schema + "\n\n"

# 2) Data
We'll parse each row into however many rows we need.

## 2-a) Creating the row parsing function
The row parsing function `parseRow` takes a row and appends the appropriate
lines to `sqlString` to ensure all entities are represented (once each) in their
respective data tables, and that any relationships represented by the row are
likewise in their respective relationship tables.

        parseRow = (row) ->
            insertStatement = ""

            if not knownEntities[row['AS Id']]
              insertStatement += 'INSERT INTO anatomic_sites VALUES (\'' + row['AS Id'] + '\', \'' + row['Anatomic Site'] + '\'); \n'
              knownEntities[row['AS Id']] = true

            if not knownEntities[row['SubS Id']]
              insertStatement += 'INSERT INTO subsites VALUES (\'' + row['SubS Id'] + '\', \'' + row['Subsite'] + '\'); \n'
              knownEntities[row['SubS Id']] = true

            if not knownEntities[row['Cat Id']]
              insertStatement += 'INSERT INTO categories VALUES (\'' + row['Cat Id'] + '\', \'' + row['Category'] + '\'); \n'
              knownEntities[row['Cat Id']] = true

            if not knownEntities[row['DX Id']]
              insertStatement += 'INSERT INTO diagnoses VALUES (\'' + row['DX Id'] + '\', \'' + row['Diagnosis'] + '\'); \n'
              knownEntities[row['DX Id']] = true

            subsiteStatement = 'INSERT INTO dis_relationship_site_subsite VALUES (\'' + row['AS Id'] + '\', \'' + row['SubS Id'] + '\'); \n'
            if not knownSubsites[subsiteStatement]
              insertStatement += subsiteStatement
              knownSubsites[subsiteStatement] = true

            insertStatement += 'INSERT INTO dis_relationship_master VALUES (\'' + row['Id'] + '\', \'' + row['Cat Id'] + '\', \'' + row['AS Id'] + '\', \'' + row['DX Id'] + '\'); \n'
            sqlString += insertStatement

## 2-b) Run the row parsing function on all rows

        parseRow row for row in vocabularyJson

# 3) Return the SQL Represetation
We `callback` with `null` as the first argument since there was no error.

        callback null, sqlString

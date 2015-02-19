# CHTN Vocabulary JSON to SQL Parser

Parses the JSON representation of the CHTN Vocabulary to [JSON-LD][].

# 0) Setup

    packageInfo = require "../package.json"         # location relative to where this file lives
    _           = require "underscore"
    jsonld      = require "jsonld"

    module.exports = (vocabularyJson, callback) ->

## 0-a) JSON-LD Context
[JSON-LD][] documents are just JSON documents with [context][], so we define 
the context here. `root` is the URI-prefix for all CHTN entities; we also
define the `chtn` prefix.

        root = "http://chtn.org/vocabulary#{packageInfo.version}/" # URI-prefix for all CHTN entities
        context =
            "@vocab": root
            "chtn": root

# 1) Helper Functions
We'll use the following keys to pull the data out of the rows.

        keys =
          site:
            id: 'AS Id'
            description: 'Anatomic Site'
            type: 'Site'
          subsite:
            id: 'SubS Id'
            description: 'Subsite'
            type: 'Subsite'
          category:
            id: 'Cat Id'
            description: 'Category'
            type: 'Category'
          diagnosis:
            id: 'DX Id'
            description: 'Diagnosis'
            type: 'Diagnosis'

## 1-a) createRowEntity
`createRowEntity` creates an entity (site, subsite, category, or diagnosis)
given a `row` and a `type`.

        createRowEntity = (row, type) ->
            entity = null
            if row[keys[type].id]
                entity =
                    "@id": "chtn:#{row[keys[type].id]}"
                    "description": row[keys[type].description]
                    "@type": "chtn:#{keys[type].type}"
            return entity

## 1-b) createRowEntityCompatibleStatements
`createRowEntityCompatibleStatements` generates the compatibility statements,
`a chtn:compatible b` for all combinations of the given `entities`.

        createRowEntityCompatibleStatements = (entities) ->
            entities.forEach (entity) ->
                if not entity then return
                others = _.without(entities, entity, null)
                entity.compatible = others.map (other) ->
                    _.pick other, '@id'
            return 'done'

## 1-c) createRowEntities
`createRowEntities` creates all the entities for a given row, including their 
compatibility statements.

        createRowEntities = (row) ->
            site      = createRowEntity row, 'site'
            subsite   = createRowEntity row, 'subsite'
            category  = createRowEntity row, 'category'
            diagnosis = createRowEntity row, 'diagnosis'
            entities = [
                site
                subsite
                category
                diagnosis
            ]
            createRowEntityCompatibleStatements entities
            return entities

## 1-d) createGraph
`createGraph` creates and collects the row entities for each row.

        createGraph = (vocabularyJson, context) ->
            graph = []
            vocabularyJson.forEach (row) ->
                entityGraphs = createRowEntities row
                entityGraphs.forEach (entityGraph) ->
                    if not entityGraph then return
                    entityGraph['@context'] = context
                    graph.push entityGraph
            return graph

# 2) Create Graph, Flatten JSON-LD
We'll use the `createGraph` helper function to create a graph, then
validate the graph by flattening it with the `flatten` method
of the [jsonld.js][] library.

        graph = createGraph vocabularyJson, context
        jsonld.flatten graph, (err, flattenedGraph) ->
            if err then callback err else callback null, flattenedGraph

[JSON-LD]: http://json-ld.org/ "JSON-LD Homepage"
[context]: http://www.w3.org/TR/json-ld/#the-context
[jsonld.js]: https://github.com/digitalbazaar/jsonld.js
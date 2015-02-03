(function () {

    'use strict';

    var CHTN = window.CHTN = {

        // CHTN Vocabulary Version
        version: "1.0.0",

        // Column names in the CSV file / Keys in JSON version.
        keys: {
            site: {
                id: "AS Id",
                description: "Anatomic Site"
            },
            subsite: {
                id: "SubS Id",
                description: "Subsite"
            },
            category: {
                id: "Cat Id",
                description: "Category"
            },
            diagnosis: {
                id: "DX Id",
                description: "Diagnosis"
            }
        },

        // Placeholders for raw data
        raw: {
            json: {},
            sql: "",
            rdf: "",
            jsonld: false,
            text: ""
        },

        // Download and Parse the Vocabulary TSV file, and populate the CHTN object.
        _init: function () {
            Papa.parse("CHTN%20Vocab-Disease%20List.txt", {
                download: true,
                header: true,
                delimiter: "\t",
                complete: function (results, file) {
                    console.log("CHTN Vocabulary downloaded and parsed. See CHTN.vocabulary.");
                    CHTN.raw.text = file;
                    CHTN._parseResults = results;
                    CHTN.vocabulary = CHTN.raw.json = results.data;
                    $("#raw-json").text(JSON.stringify(results.data, null, 2));
                }
            });
        },


        _createCrossFilters: function (vocabulary) {
            var cf = CHTN.crossfilter = crossfilter(vocabulary);

            CHTN.groups     = {};
            CHTN.dimensions = {};

            CHTN.dimensions.byCategory      = cf.dimension(function (d)  { return d["Category"]; });
            CHTN.dimensions.byAnatomicSite  = cf.dimension(function (d)  { return d["Anatomic Site"]; });
            CHTN.dimensions.bySubsite       = cf.dimension(function (d)  { return d["Subsite"]; });
            CHTN.dimensions.byDiagnosis     = cf.dimension(function (d)  { return d["Diagnosis"]; });
            
            CHTN.groups.countByCategory     = CHTN.dimensions.byCategory.group().reduceCount();
            CHTN.groups.countByAnatomicSite = CHTN.dimensions.byAnatomicSite.group().reduceCount();
            CHTN.groups.countBySubsite      = CHTN.dimensions.bySubsite.group().reduceCount();
            CHTN.groups.countByDiagnosis    = CHTN.dimensions.byDiagnosis.group().reduceCount();
        },

        _init_sql: function () {
            if (CHTN.raw.sql) return;
            CHTN._createSQLTables();
            CHTN._createSQLData();
            $("#raw-sql").text(CHTN.raw.sql)
        },


        _createSQLTables: function () {
            var createTableStatement = "";
            createTableStatement += "CREATE TABLE categories      (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256)); \n"
            createTableStatement += "CREATE TABLE anatomic_sites  (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256)); \n"
            createTableStatement += "CREATE TABLE diagnoses       (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256)); \n"
            createTableStatement += "CREATE TABLE subsites        (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256)); \n"
            createTableStatement += "\n";
            createTableStatement += [
                "CREATE TABLE dis_relationship_master (",
                "    ID VARCHAR2(36) PRIMARY KEY,",
                "    CATEGORY_ID VARCHAR2(36) CONSTRAINT CATEGORY_ID REFERENCES categories (id),",
                "    ANATOMIC_SITE_ID VARCHAR2(36) CONSTRAINT ANATOMIC_SITE_ID REFERENCES anatomic_sites (id),",
                "    DIAGNOSIS_ID VARCHAR2(36) CONSTRAINT DIAGNOSIS_ID REFERENCES diagnoses (id)",
                ");"].join(" \n");
            createTableStatement += "\n";
            createTableStatement += "\n";
            createTableStatement += [
                "CREATE TABLE dis_relationship_site_subsite (",
                "    ANATOMIC_SITE_ID VARCHAR2(36) CONSTRAINT ANATOMIC_SITE_ID REFERENCES anatomic_sites (id),",
                "    ANATOMIC_SUBSITE_ID VARCHAR2(36) CONSTRAINT ANATOMIC_SUBSITE_ID REFERENCES subsites (id)",
                ");"].join(" \n");
            createTableStatement += "\n";
            createTableStatement += "\n";
            CHTN.raw.sql += createTableStatement;
        },


        _createSQLData: function () {
            var knownEntities = {}, knownSubsites = {};
            CHTN.raw.json.forEach(function (row) {
                var insertStatement = "", subsiteStatement;
                if (!knownEntities[row["AS Id"]]) {
                    insertStatement += "INSERT INTO anatomic_sites VALUES ('"+row["AS Id"]+"', '"+row["Anatomic Site"]+"'); \n";
                    knownEntities[row["AS Id"]] = true;
                }
                if (!knownEntities[row["SubS Id"]]) {
                    insertStatement += "INSERT INTO subsites VALUES ('"+row["SubS Id"]+"', '"+row["Subsite"]+"'); \n";
                    knownEntities[row["SubS Id"]] = true;
                }
                if (!knownEntities[row["Cat Id"]]) {
                    insertStatement += "INSERT INTO categories VALUES ('"+row["Cat Id"]+"', '"+row["Category"]+"'); \n";
                    knownEntities[row["Cat Id"]] = true;
                }
                if (!knownEntities[row["DX Id"]]) {
                    insertStatement += "INSERT INTO diagnoses VALUES ('"+row["DX Id"]+"', '"+row["Diagnosis"]+"'); \n";
                    knownEntities[row["DX Id"]] = true;
                }
                subsiteStatement = "INSERT INTO dis_relationship_site_subsite VALUES ('"+row["AS Id"]+"', '"+row["SubS Id"]+"'); \n";
                if (!knownSubsites[subsiteStatement]) {
                    insertStatement += subsiteStatement;
                    knownSubsites[subsiteStatement] = true;
                }
                insertStatement += "INSERT INTO dis_relationship_master VALUES ('"+row["Id"]+"', '"+row["Cat Id"]+"', '"+row["AS Id"]+"', '"+row["DX Id"]+"'); \n";
                CHTN.raw.sql += insertStatement;
            });
        },

        populateSQLDB: function () {
            var sql = window.SQL;
            CHTN.db = new sql.Database();
            console.log("CHTN SQL Vocabulary loaded into CHTN.db. Query with CHTN.db.exec(query) or CHTN.db.simplequery(query).");
            CHTN.db.simplequery = function (query) {
                var results = CHTN.db.exec(query);
                return results[0].values.map(function (value) {
                    return value;
                });
            }
        },

        showTables: function () {
            var tableQueryResults = CHTN.db.exec("SELECT name FROM sqlite_master WHERE type='table';")
            return tableQueryResults[0].values.map(function (value) {
                return value[0];
            });
        },

        _init_jsonld: function () {
            var root, context, docs = [], jsonld = jsonldjs;
            root = "http://chtn.org/vocabulary/"+CHTN.version+"/"
            context = {
                "@vocab": root,
                "chtn": root
            }
            CHTN.raw.json.forEach(function (row) {
                var graph = CHTN._createRowGraph(row, context);
                docs.push(graph);
            });
            jsonld.flatten(docs, function (err, flattened) {
                CHTN.raw.jsonld = flattened
                $("#raw-jsonld").text(JSON.stringify(CHTN.raw.jsonld, null, 2));
                // jsonld.compact(flattened, context, function (err, compacted) {
                //     CHTN.raw.jsonld = compacted;
                //     // jsonld.normalize(compacted, {format: 'application/nquads'}, function(err, normalized) {
                //     //     t2 = Date.now();
                //     //     console.log("Finished normalizing after ", (t2-t3)/(1000), "seconds.");
                //     //     console.log("Finished everything after ", (t2-t0)/(1000), "seconds.");
                //     //     CHTN.rdf = normalized
                //     //     $("#raw-label").text("Raw RDF")
                //     //     $("#raw").text(CHTN.rdf)
                //     // });
                //     $("#raw-jsonld").text(JSON.stringify(CHTN.raw.jsonld, null, 2));
                // });

            });

        },

        _createRowGraph: function (row, context) {
            var graph;
            graph = {
                "@context": context,
                "@id": "chtn:row/"+row.Id,
                "@graph": CHTN._createRowEntities(row)
            };
            return graph;
        },

        _createRowEntities: function (row) {
            var site, subsite, category, diagnosis, entities = [];
            site = CHTN._createRowEntity(row, "site");
            subsite = CHTN._createRowEntity(row, "subsite");
            category = CHTN._createRowEntity(row, "category");
            diagnosis = CHTN._createRowEntity(row, "diagnosis");
            entities = [site, subsite, category, diagnosis];
            CHTN._createRowEntityCompatibleStatements(entities);
            return entities;
        },

        _createRowEntity: function (row, type) {
            if (row[CHTN.keys[type].id]) {
                return {
                    "@id": "chtn:"+row[CHTN.keys[type].id],
                    "description": row[CHTN.keys[type].description]
                };
            } else return null;
        },

        _createRowEntityCompatibleStatements: function (entities) {
            entities.forEach(function (entity) {
                if (!entity) return;
                var others = _.without(entities, entity, null)
                entity.compatible = others.map(function (other) { return _.pick(other, "@id"); });
            });
            return "done";
        },

        saveRDF: function () {
            var blob = new Blob([CHTN.rdf], {type: "application/n-quads;charset=utf-8"})
            var href = "data:application/n-quads;base64,"+atob(CHTN.rdf || "")
            $("<a>").attr("href", href).appendTo("body");
            //saveAs(blob, "chtn-vocab.nq")
        },


        queries: {
            denormalize_dis_relationship_master: "SELECT rel.CATEGORY_ID, c.description, rel.ANATOMIC_SITE_ID, s.description, rel.DIAGNOSIS_ID, d.description FROM dis_relationship_master AS rel LEFT OUTER JOIN categories AS c ON rel.CATEGORY_ID = c.id LEFT OUTER JOIN anatomic_sites AS s ON rel.ANATOMIC_SITE_ID = s.id LEFT OUTER JOIN diagnoses AS d ON rel.DIAGNOSIS_ID = d.id",
            denormalize_dis_relationship_site_subsite: "SELECT rel.ANATOMIC_SITE_ID, s.description, rel.ANATOMIC_SUBSITE_ID, ss.description FROM dis_relationship_site_subsite AS rel LEFT OUTER JOIN anatomic_sites AS s ON rel.ANATOMIC_SITE_ID = s.id LEFT OUTER JOIN subsites AS ss ON rel.ANATOMIC_SUBSITE_ID = ss.id"
        },

        printSome: function (arr) {
            console.log(JSON.stringify(arr.slice(0,5), null, 4));
        }

    }

    CHTN._init();

    $('a[data-toggle="tab"]').on('show.bs.tab', function (e) {
        var initFunction = CHTN["_init_"+$(e.target).attr("aria-controls")];
        if (typeof initFunction === "function") initFunction();
    })

})();
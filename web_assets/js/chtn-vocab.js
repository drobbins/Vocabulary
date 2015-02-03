(function () {

    'use strict';

    var CHTN = window.CHTN = {

        version: "1.0.0",

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

        // Download and Parse the Vocabulary TSV file, and populate the CHTN object.
        _init: function () {
            Papa.parse("CHTN%20Vocab-Disease%20List.txt", {
                download: true,
                header: true,
                delimiter: "\t",
                complete: function (results, file) {
                    console.log("CHTN Vocabulary downloaded and parsed. See CHTN.vocabulary.");
                    CHTN._rawVocabulary = file;
                    CHTN._parseResults = results;
                    CHTN.vocabulary = results.data;
                    //CHTN._createCrossFilters(CHTN.vocabulary);
                    //CHTN._initSQL();
                    $("#raw").text(JSON.stringify(results.data, null, 2));
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

        _initSQL: function () {
            var sql = window.SQL;
            CHTN.db = new sql.Database();

            CHTN._createSQLTables();
            CHTN._loadSQLData();

            CHTN.db.simplequery = function (query) {
                var results = CHTN.db.exec(query);
                return results[0].values.map(function (value) {
                    return value;
                });
            }

            console.log("CHTN SQL Vocabulary loaded into CHTN.db. Query with CHTN.db.exec(query) or CHTN.db.simplequery(query).");
        },

        _createSQLTables: function () {
            var createTablesString = "";
            createTablesString += "CREATE TABLE categories      (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256));"
            createTablesString += "CREATE TABLE anatomic_sites  (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256));"
            createTablesString += "CREATE TABLE diagnoses       (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256));"
            createTablesString += "CREATE TABLE subsites        (id VARCHAR(36) PRIMARY KEY, description VARCHAR(256));"
            createTablesString += [
                "CREATE TABLE dis_relationship_master (",
                "    ID VARCHAR2(36) PRIMARY KEY,",
                "    CATEGORY_ID VARCHAR2(36) CONSTRAINT CATEGORY_ID REFERENCES categories (id),",
                "    ANATOMIC_SITE_ID VARCHAR2(36) CONSTRAINT ANATOMIC_SITE_ID REFERENCES anatomic_sites (id),",
                "    DIAGNOSIS_ID VARCHAR2(36) CONSTRAINT DIAGNOSIS_ID REFERENCES diagnoses (id)",
                ");"].join("");
            createTablesString += [
                "CREATE TABLE dis_relationship_site_subsite (",
                "    ANATOMIC_SITE_ID VARCHAR2(36) CONSTRAINT ANATOMIC_SITE_ID REFERENCES anatomic_sites (id),",
                "    ANATOMIC_SUBSITE_ID VARCHAR2(36) CONSTRAINT ANATOMIC_SUBSITE_ID REFERENCES subsites (id)",
                ");"].join("");
            CHTN.db.run(createTablesString);
        },

        _loadSQLData: function () {
            var knownEntities = {}, knownSubsites = {};
            CHTN.vocabulary.forEach(function (row) {
                var insertStatement = "", subsiteStatement;
                if (!knownEntities[row["AS Id"]]) {
                    insertStatement += "INSERT INTO anatomic_sites VALUES ('"+row["AS Id"]+"', '"+row["Anatomic Site"]+"');";
                    knownEntities[row["AS Id"]] = true;
                }
                if (!knownEntities[row["SubS Id"]]) {
                    insertStatement += "INSERT INTO subsites VALUES ('"+row["SubS Id"]+"', '"+row["Subsite"]+"');";
                    knownEntities[row["SubS Id"]] = true;
                }
                if (!knownEntities[row["Cat Id"]]) {
                    insertStatement += "INSERT INTO categories VALUES ('"+row["Cat Id"]+"', '"+row["Category"]+"');";
                    knownEntities[row["Cat Id"]] = true;
                }
                if (!knownEntities[row["DX Id"]]) {
                    insertStatement += "INSERT INTO diagnoses VALUES ('"+row["DX Id"]+"', '"+row["Diagnosis"]+"');";
                    knownEntities[row["DX Id"]] = true;
                }
                subsiteStatement = "INSERT INTO dis_relationship_site_subsite VALUES ('"+row["AS Id"]+"', '"+row["SubS Id"]+"');";
                if (!knownSubsites[subsiteStatement]) {
                    insertStatement += subsiteStatement;
                    knownSubsites[subsiteStatement] = true;
                }
                insertStatement += "INSERT INTO dis_relationship_master VALUES ('"+row["Id"]+"', '"+row["Cat Id"]+"', '"+row["AS Id"]+"', '"+row["DX Id"]+"');";
                CHTN.db.run(insertStatement);
            });
        },

        showTables: function () {
            var tableQueryResults = CHTN.db.exec("SELECT name FROM sqlite_master WHERE type='table';")
            return tableQueryResults[0].values.map(function (value) {
                return value[0];
            });
        },

        _toRDF: function () {
            var root, context, docs = [];
            root = "http://chtn.org/vocabulary/"+CHTN.version+"/"
            context = {
                "@vocab": root,
                "chtn": root
            }
            CHTN.vocabulary.forEach(function (row) {
                var site, subsite, category, diagnosis, graph;
                graph = {
                    "@context": context,
                    "@id": "chtn:row/"+row.Id,
                    "@graph": []
                }
                site = CHTN._extractEntity(row, "site")
                subsite = CHTN._extractEntity(row, "subsite")
                category = CHTN._extractEntity(row, "category")
                diagnosis = CHTN._extractEntity(row, "diagnosis")
                CHTN._annotateWithCompatibilityStatements([site, subsite, category, diagnosis])
                graph["@graph"].push(site, subsite, category, diagnosis)
                docs.push(graph);
            });

            var t0, t1, t2, t3;
            console.log("Starting process at ", t0 = Date.now());
            jsonld.flatten(docs, function (err, flattened) {
                t1 = Date.now();
                console.log("Finished flattening after ", (t1-t0)/(1000), "seconds.");
                CHTN.jsonld = flattened
                jsonld.compact(flattened, context, function (err, compacted) {
                    t3 = Date.now();
                    console.log("Finished compacting after ", (t3-t1)/(1000), "seconds.");
                    CHTN.jsonld = compacted;
                    jsonld.normalize(compacted, {format: 'application/nquads'}, function(err, normalized) {
                        t2 = Date.now();
                        console.log("Finished normalizing after ", (t2-t3)/(1000), "seconds.");
                        console.log("Finished everything after ", (t2-t0)/(1000), "seconds.");
                        CHTN.rdf = normalized
                        $("#raw-label").text("Raw RDF")
                        $("#raw").text(CHTN.rdf)
                    });
                });

            });

        },

        saveRDF: function () {
            var blob = new Blob([CHTN.rdf], {type: "application/n-quads;charset=utf-8"})
            var href = "data:application/n-quads;base64,"+atob(CHTN.rdf || "")
            $("<a>").attr("href", href).appendTo("body");
            //saveAs(blob, "chtn-vocab.nq")
        },

        _extractEntity: function (row, type) {
            if (row[CHTN.keys[type].id]) {
                return {
                    "@id": "chtn:"+row[CHTN.keys[type].id],
                    "description": row[CHTN.keys[type].description]
                }
            } else return null
        },

        _annotateWithCompatibilityStatements: function (entities) {
            entities.forEach(function (entity) {
                if (!entity) return;
                var others = _.without(entities, entity)
                entity.compatible = others.map(function (other) { return _.pick(other, "@id"); });
            });
            return "done";
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

})();
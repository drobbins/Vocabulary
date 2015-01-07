(function () {

    'use strict';

    var CHTN = window.CHTN = {

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
                    CHTN._createCrossFilters(CHTN.vocabulary);
                    CHTN._initSQL();
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

        queries: {
            denormalize_dis_relationship_master: "SELECT rel.CATEGORY_ID, c.description, rel.ANATOMIC_SITE_ID, s.description, rel.DIAGNOSIS_ID, d.description FROM dis_relationship_master AS rel LEFT OUTER JOIN categories AS c ON rel.CATEGORY_ID = c.id LEFT OUTER JOIN anatomic_sites AS s ON rel.ANATOMIC_SITE_ID = s.id LEFT OUTER JOIN diagnoses AS d ON rel.DIAGNOSIS_ID = d.id",
            denormalize_dis_relationship_site_subsite: "SELECT rel.ANATOMIC_SITE_ID, s.description, rel.ANATOMIC_SUBSITE_ID, ss.description FROM dis_relationship_site_subsite AS rel LEFT OUTER JOIN anatomic_sites AS s ON rel.ANATOMIC_SITE_ID = s.id LEFT OUTER JOIN subsites AS ss ON rel.ANATOMIC_SUBSITE_ID = ss.id"
        }

    }

    CHTN._init();

})();
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

            var createTablesString = "";
            createTablesString += "CREATE TABLE categories      (id VARCHAR(16), description VARCHAR(256));"
            createTablesString += "CREATE TABLE anatomic_sites  (id VARCHAR(16), description VARCHAR(256));"
            createTablesString += "CREATE TABLE diagnoses       (id VARCHAR(16), description VARCHAR(256));"
            createTablesString += "CREATE TABLE subsites        (id VARCHAR(16), description VARCHAR(256));"
            CHTN.db.run(createTablesString);


        },

        showTables: function () {
            var tableQueryResults = CHTN.db.exec("SELECT name FROM sqlite_master WHERE type='table';")
            return tableQueryResults[0].values.map(function (value) {
                return value[0];
            });
        },

    }

    CHTN._init();

})();
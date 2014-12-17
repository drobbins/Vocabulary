(function () {

    'use strict';

    var CHTN = window.CHTN = {
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
                    $("#raw").text(JSON.stringify(results.data, null, 2));
                }
            });
        }
    }

    CHTN._init();

})();
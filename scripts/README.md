# CHTN Vocabular Scripts

Build SQL, [JSON-LD], and other versions of the CHTN Vocabulary

## Usage

Clone this repository, cd into the scripts directory, install the npm dependencies, and run the script.

```shell
$ git clone https://github.com/CooperativeHumanTissueNetwork/Vocabulary.git
$ cd Vocabulary/scripts
$ npm install
$ npm run-script build
```

### Getting Started (Windows)

This script uses [d3][] to parse the CSV version of the vocabulary, which in turn has dependencies that require Python and C++ to build. This will hopefully fixed in a future version. A few possible steps to fix errors with `npm install`:

1. Install Python >= 2.5 and < 3.0. Make sure it's in your path.
2. Install a Microsoft Windows SDK or Visual Studio 2008+
    * use the `msvs_version` flag for versions other than 2008:

        ```shell
        $ npm install --msvs_version=2012
        ```

## History

See CHANGELOG.md

[JSON-LD]: http://json-ld.org/ "JSON-LD Homepage"
[d3]: http://d3js.org/ "d3js homepage"
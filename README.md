# FYPT-Importer

This process takes the raw data from HCAD and creates JSON files that are ready to be imported into MondoDB

Files needed from https://hcad.org/pdata/pdata-property-downloads.html

- building_res.txt
- extra_features_detail1.txt
- extra_features_detail2.txt
- jur_tax_dist_percent_rate.txt
- jur_value.txt
- owner.txt
- real_acct.txt
- structural_elem1.txt
- structural_elem2.txt

## Step 1

If there are any output-HCAD-XXXX files in the /files directory, delete them.

Run node index.js to create the output JSON files.

You can edit the `recordsSplit` variable in index.js to create records in batches of `recordsSplit` (value over 500k seems to run out of memory)

The file `output-HCAD-50.json` is just a test file of the first 50 records. These records will also exist in your first real output file so you don't need to import this file in Step 2.

## Step 2

Before loading to Mongo, remove all existing documents. Make sure you don't remove the collection or indexes!

Import the JSON files (from the /files directory) using `mongoimport`

mongoimport --uri "mongodb://`<USERNAME>:<PASSWORD>`@tax-watch-prod-shard-00-00-cpsde.mongodb.net:27017,tax-watch-prod-shard-00-01-cpsde.mongodb.net:27017,tax-watch-prod-shard-00-02-cpsde.mongodb.net:27017/fypt?ssl=true&replicaSet=Tax-Watch-Prod-shard-0&readPreference=primary&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1" --collection hcad --file `output-HCAD-500000.json` --jsonArray

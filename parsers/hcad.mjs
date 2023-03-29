import fs from "fs";
import { get } from "http";
import readline from "node:readline/promises";
//import { dataApi } from '../handlers/mongodb.mjs'

const filePath = "./files";
const recordsSplit = 500000;
let hcadMap = new Map();

export async function loadHCAD() {
  const outputFile = "output-HCAD";
  // if (fs.existsSync(`${filePath}/${outputFile}`))
  //     fs.unlinkSync(`${filePath}/${outputFile}`)

  await getRealAcct();
  await getOwners();
  await getBuildingRes();
  await getExtraFeatures();
  await getStructuralElements();
  await getTaxRates();

  let i = 0;
  let outputArr = [];
  for (let account of hcadMap.values()) {
    if (account.structureType != "R") {
      hcadMap.delete(account);
      continue;
    }

    i++;
    process.stdout.write("Processing Output File " + i + " lines...\r");
    outputArr.push(account);
    if (i == 50) {
      fs.writeFileSync(
        `${filePath}/${outputFile}-${i}.json`,
        JSON.stringify(outputArr)
      );
    }
    if (i % recordsSplit == 0) {
      fs.writeFileSync(
        `${filePath}/${outputFile}-${i}.json`,
        JSON.stringify(outputArr)
      );
      outputArr = [];
    }
  }

  fs.writeFileSync(
    `${filePath}/${outputFile}-${i}.json`,
    JSON.stringify(outputArr)
  );
}

function getFile(fileName) {
  const inStream = fs.createReadStream(`${filePath}/${fileName}`);
  return readline.createInterface(inStream);
}

async function getRealAcct() {
  console.log("Getting Real Estate Accounts...");
  const fileStream = getFile("real_acct.txt");
  for await (const row of fileStream) {
    const columns = row.split("\t");

    const account = columns[0].trim();

    if (account == "acct" || account == null) continue;

    const sqFt = parseInt(columns[38], 10) || 0;
    const imprvVal = parseInt(columns[44], 10) || 0;

    const priceSqFt = sqFt > 0 ? parseFloat((imprvVal / sqFt).toFixed(2)) : 0;

    const acct = {
      account,
      streetNum: parseInt(columns[11], 10) || 0,
      addr1: columns[17].trim(),
      addr2: columns[18].trim(),
      addr3: columns[19].trim(),
      hoodCode: parseFloat(columns[24]) || 0,
      sqFt,
      landValue: parseInt(columns[43], 10) || 0,
      imprvVal,
      xFeatures: 0,
      imprvValNoXf: imprvVal,
      marketValue: parseInt(columns[49], 10) || 0,
      priceSqFt,
      cadAdj: 0,
      cadDesc: "Not Provided",
      cduAdj: 0,
      cduDesc: "Not Provided",
      grdAdj: 0,
      grdDesc: "Not Provided",
      taxRate: 0,
    };
    hcadMap.set(columns[0].trim(), acct);
  }
  fileStream.close();
}

async function getOwners() {
  console.log("Getting Owners...");
  const fileStream = getFile("owners.txt");
  for await (const row of fileStream) {
    const columns = row.split("\t");

    const account = columns[0].trim();

    if (columns[1] > 1 || account == "acct" || account == null) continue;

    const owner = columns[2] ? columns[2].trim() : "";

    const ownerObj = {
      account,
      owner,
    };
    hcadMap.set(account, { ...ownerObj, ...hcadMap.get(account) });
  }
  fileStream.close();
}

async function getBuildingRes() {
  console.log("Getting Buldling Res...");
  const fileStream = getFile("building_res.txt");
  for await (const row of fileStream) {
    const columns = row.split("\t");

    const account = columns[0].trim();

    if (columns[2].trim() > 1 || account == "acct" || account == null) continue;

    const dateBuilt = parseInt(columns[12], 10) || 0;
    const yrRemodel =
      (parseInt(columns[14], 10) || 0) == 0 ? "NA" : parseInt(columns[14], 10);
    const yrUpdated = dateBuilt + " / " + yrRemodel;

    const buildingRes = {
      account: columns[0].trim(),
      accrDepPct: parseFloat(columns[9]) || 0,
      yrUpdated: yrUpdated,
      structureType: columns[5].trim(),
    };
    hcadMap.set(account, { ...buildingRes, ...hcadMap.get(account) });
  }
  fileStream.close();
}

async function getExtraFeatures() {
  console.log("Getting Extra Features...");
  let i = 0;
  do {
    i++;
    const fileStream = getFile(`extra_features_detail${i}.txt`);
    for await (const row of fileStream) {
      const columns = row.split("\t");

      const account = columns[0].trim();

      if (account == "acct" || account == null) continue;

      const asd_val = parseInt(columns[19], 10) || 0;
      if (asd_val == 0) continue;

      const currentValues = hcadMap.get(account);

      const extraFeatures = {
        xFeatures: currentValues.xFeatures + asd_val,
        imprvValNoXf: currentValues.imprvValNoXf - asd_val,
      };

      hcadMap.set(account, { ...hcadMap.get(account), ...extraFeatures });
    }
    fileStream.close();
  } while (i < 2);
}

async function getStructuralElements() {
  console.log("Getting Structural Elements...");
  let i = 0;
  do {
    i++;
    const fileStream = getFile(`structural_elem${i}.txt`);
    for await (const row of fileStream) {
      const columns = row.split("\t");

      const account = columns[0].trim();
      const type = columns[4] ? columns[4].trim().toLowerCase() : "";

      if (parseInt(columns[1], 10) > 1 || account == "acct" || account == null)
        continue;
      if (!["cad", "cdu", "grd"].includes(type)) continue;

      let structuralElem = {};
      structuralElem[`${type}Adj`] = parseFloat(columns[3]);
      structuralElem[`${type}Desc`] = columns[6].trim();

      hcadMap.set(account, { ...hcadMap.get(account), ...structuralElem });
    }
    fileStream.close();
  } while (i < 2);
}

async function getTaxRates() {
  console.log("Getting Taxes, ugh...");
  let taxDistMap = new Map();

  const fileTaxDistricts = getFile("jur_tax_dist_percent_rate.txt");
  for await (const row of fileTaxDistricts) {
    const columns = row.split("\t");

    const taxDist = columns[1].trim();
    const taxRate = parseFloat(columns[3]) || 0;

    if (taxDist == "tax_dist") continue;

    taxDistMap.set(taxDist, taxRate);
  }
  fileTaxDistricts.close();

  const fileTaxJurisdictions = getFile("jur_value.txt");
  for await (const row of fileTaxJurisdictions) {
    const columns = row.split("\t");
    const account = columns[0].trim();

    if (account == "acct" || account == "" || account == null) continue;

    const taxDist = columns[1] ? columns[1].trim() : "";

    const distTaxRate = taxDistMap.get(taxDist) || 0;

    const taxRate = {
      taxRate: hcadMap.get(account).taxRate + distTaxRate,
    };

    hcadMap.set(account, { ...hcadMap.get(account), ...taxRate });
  }
  fileTaxJurisdictions.close();
}

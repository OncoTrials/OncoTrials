// build-postal-dataset.mjs — compiles a country's postal-code dataset for the
// offline location lookup used by the trials page filter.
//
// What it does:
//   1. Downloads the per-country postal archive from GeoNames (CC BY 4.0).
//   2. Extracts the tab-separated data file inside it.
//   3. Keeps only what the filter needs: postalCode -> [lat, lng, city, region].
//   4. Writes a compact JSON to ../public/geo/<country>-postal.json.
//
// Usage (from OncoTrials-Frontend/):
//   node scripts/build-postal-dataset.mjs US
//   node scripts/build-postal-dataset.mjs CA      (when Canada is added)
//
// The output is a static asset that ships with the app and is lazy-loaded at
// runtime, so this script only needs to run when refreshing/adding a country.
//
// Requires the dev dependency `adm-zip` (npm i -D adm-zip).

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import AdmZip from 'adm-zip';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputDir = join(scriptDir, '..', 'public', 'geo');

// GeoNames tab-separated columns we care about (see their export readme).
const COL_POSTAL_CODE = 1;
const COL_PLACE_NAME  = 2;
const COL_REGION_CODE = 4;   // e.g. "CA" for California, "ON" for Ontario
const COL_LATITUDE    = 9;
const COL_LONGITUDE   = 10;

// Round coordinates to 5 decimals (~1 m precision) to keep the file small.
const round5 = (n) => Math.round(Number(n) * 1e5) / 1e5;

async function buildCountryDataset(countryCode) {
    const upper = countryCode.toUpperCase();
    const lower = countryCode.toLowerCase();
    const archiveUrl = `https://download.geonames.org/export/zip/${upper}.zip`;

    console.log(`[build-postal-dataset] downloading ${archiveUrl} ...`);
    const response = await fetch(archiveUrl);
    if (!response.ok) {
        throw new Error(`Failed to download ${archiveUrl}: HTTP ${response.status}`);
    }
    const archiveBuffer = Buffer.from(await response.arrayBuffer());

    // The archive contains "<COUNTRY>.txt" (the data) and a "readme.txt".
    const zip = new AdmZip(archiveBuffer);
    const dataEntry = zip.getEntry(`${upper}.txt`);
    if (!dataEntry) throw new Error(`${upper}.txt not found inside the archive`);
    const rows = zip.readAsText(dataEntry).split('\n');

    // postalCode -> [lat, lng, city, region]. First occurrence of each code wins
    // (some codes appear multiple times for nearby places).
    const postalToLocation = {};
    let kept = 0;
    for (const row of rows) {
        if (!row.trim()) continue;
        const cols = row.split('\t');
        const postalCode = cols[COL_POSTAL_CODE]?.trim();
        const lat = cols[COL_LATITUDE];
        const lng = cols[COL_LONGITUDE];
        if (!postalCode || !lat || !lng) continue;
        if (postalToLocation[postalCode]) continue;

        postalToLocation[postalCode] = [
            round5(lat),
            round5(lng),
            (cols[COL_PLACE_NAME] || '').trim(),
            (cols[COL_REGION_CODE] || '').trim(),
        ];
        kept++;
    }

    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${lower}-postal.json`);
    await writeFile(outputPath, JSON.stringify(postalToLocation));
    console.log(`[build-postal-dataset] wrote ${kept} ${upper} postal codes to ${outputPath}`);
}

const countryCode = process.argv[2];
if (!countryCode) {
    console.error('Usage: node scripts/build-postal-dataset.mjs <COUNTRY_CODE>   e.g. US');
    process.exit(1);
}

buildCountryDataset(countryCode).catch((err) => {
    console.error('[build-postal-dataset] failed:', err.message);
    process.exit(1);
});

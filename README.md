# KshetraAI · Sisarma pilot

A local English/Hindi land-record lookup for **Sisarma, Girwa, Udaipur**. Search one historical holding by khasra, current or previous khata number, or a recorded institutional name. Open the evidence for each result, save parcels to a local account, or export a PDF. UI routes work without external JavaScript, tiles or fonts.

## Run

Use Node.js 24 or newer. This pilot uses Node’s built-in HTTP and SQLite modules so startup requires no package downloads. Run these commands in the project folder.

```text
npm start
npm test
```

On Windows, double-click `Start-KshetraAI.cmd` to start the server and open your browser. If you start it in a terminal, open http://127.0.0.1:3000. Optional configuration is documented in `.env.example`. The service binds to loopback. The database and local accounts live in `var/kshetra.sqlite`. Keep this directory private. PDF export uses an installed Chrome or Edge; set `CHROMIUM_PATH` if necessary. The printable report remains available if rendering fails.

## What the pilot covers

- **98 khasras, 910.3300 ha in aggregate.** The source is the Sisarma section of the NIC P-26(C) jamabandi for khata 905 (previously 850), base year 2018, Samvat 2074–2077. Copy issued 13 March 2020. The state is the recorded landholder; the Forest Department, Udaipur Range is listed as cultivator, with a full share at the holding level.
- **Three cadastral sheet references.** Khasras 1811/5299, 2252 and 2253 also appear in a BhuNaksha attachment dated 12 April 2022. Each result links to its original PDF page on the government archive. The reported areas agree across the two documents. A separate jamabandi year is not provided for the 2022 sheet.
- `records/khata-905.csv` holds the transcribed parcel facts. `records/sisarma.json` carries source URLs, extraction timestamps, dates, original-language roles, map scales and sheet references. Startup checks the source count, exact area total and cross-document area agreement. A restart does not restamp the data as fresh.
- Search handles Hindi digits, slash subdivisions, bilingual aliases and small spelling differences for the two indexed institutional names. Search stays inside the selected pilot village. The index has no other holdings or private owners.
- Archived records are informational. Current ownership, possession, subsequent mutations, conversion status and litigation are unchecked. Georeferenced vectors were unavailable; the app links original map sheets and reports map-computed area as unavailable. Maps and online archives require the source host to be reachable. No valuations or investment scores are generated.

## Local account data

Local accounts use a username, scrypt password hash and expiring HTTP-only session cookies. Read-only searches can be made anonymously. Signed-in users can clear their last 20 search entries and remove saved parcels. Parcel access logs expire after 30 days while the service is running. Secret or live portal tokens are not required by this archive edition.

## Next milestone

Import a current, authorised village-level jamabandi and matching georeferenced cadastral vectors. Check village identity, parcel subdivisions, coordinate reference system and vintage before enabling point-in-polygon lookup, neighbour labels and area comparisons. Additional tehsils, live government login, change alerts and production release remain pending.


## Project layout and operations

The entry point is server.js. Application logic and HTML views are under src/, browser assets are under public/, archived evidence is under records/, and regression tests are under tests/. The original HTML launch links live under public/legacy/. Private runtime data stays under var/.

Use npm run backup for a consistent SQLite snapshot while the service is running. Copies in var/backups/ contain account and session data and need the same protection as the live database. To rehearse a restore, stop the app and set DATABASE_PATH to a separate copy of the verified backup in .env, then start the app and check saved records. Preserve the existing database and its WAL files during recovery.

GET /healthz checks database readability. Its historical coverage label describes the local archive. Live government service availability is untested. Public deployment requires a separate deployment and privacy review.

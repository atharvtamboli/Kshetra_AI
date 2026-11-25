# Sisarma evidence inventory

| Source | Date | Coverage |
| --- | --- | --- |
| [Revenue jamabandi](records/sisarma.json) | Base 2018, copy issued 2020-03-13 | Khata 905 (previous khata 850), 98 khasras, 910.3300 ha |
| [BhuNaksha attachment](records/sisarma.json) | 2022-04-12 | Three parcel sheets |

Both original government archive URLs and extraction timestamps are stored in [sisarma.json](records/sisarma.json). The [transcribed parcel register](records/khata-905.csv) contains the 98 parcel identifiers, areas and classifications.

| Khasra | Recorded area (ha) | Sheet page | Scale |
| --- | ---: | ---: | --- |
| 1811/5299 | 8.7500 | 1 | 1:6500 |
| 2252 | 9.8600 | 2 | 1:4000 |
| 2253 | 0.8800 | 3 | 1:2000 |

The archived landholder is the Rajasthan Government and the recorded cultivator is the Forest Department, Udaipur Range. Its recorded full share applies to the holding. The three map copies report matching areas.

## Coverage limits

This inventory represents a single historical holding. Current title, possession, subsequent mutations, litigation, and land-use conversion require additional evidence. Georeferenced parcel vectors are unavailable. The map sheet links allow document review. Areas are transcribed from the records. Source availability can vary.

For current information, use [Apna Khata](https://apnakhata.rajasthan.gov.in/) and obtain a fresh authorised record. Mutation tracking requires a known token. See [mutation status](https://apnakhata.rajasthan.gov.in/TrackMutationAvantan.aspx).

## Village location reference

The [BBNL district/block/village table](https://bbnl.nic.in/admnis/admin/showimg.aspx?ID=982) supplies the Sisarma locality reference. The optional OpenStreetMap view uses this reference. For cadastral search, consult [Rajasthan GIS](https://rajdharaa.rajasthan.gov.in/citizenudh/index).

## Private residential layout configuration

The public build starts with no residential records. Use one local scheme index in `var/layout-index.json` (or set `LAYOUT_INDEX_FILE`). Provide bilingual `name`, `village`, `district`, `indexedOn` and a `plots` array. Each plot has an uppercase block-number `id`, source locator, tentative `pattaReading` and `areaReadingSqFt`, original `photoSize`, pixel-coordinate `outline` and display `rotation`. The test fixture illustrates the schema with artificial values. Keep originals and personal data local.

- For a common drawing, supply a redacted `var/layout-plan/plan.png` and `plan.json` with `source`, `revisionDate`, matching SHA-256 digest `sha256`, `reviewedForSharing: true`, and `outlines` indexed by plot ID in PNG pixel coordinates.
- Add reviewed public document references as individual JSON files in `var/layout-evidence/` with `plot`, `field`, `value`, `document`, `date`, `locator`, and a government HTTPS `url`. Field identifiers are in `src/layout-evidence.js`. The source document is required for claims; handwritten readings remain provisional.
- Optional `var/layout-ground.json` accepts `source`, `sourceDate`, `originalCrs`, `reportedRmseM`, `crs: "EPSG:4326"`, closed longitude/latitude `rings` per plot ID, a separate `checkSource`, and `checks` with plot ID and independently established interior `point`. Independently verify authority, reprojection and survey accuracy.

Restart after changing local evidence. SQLite stores the observed snapshots and reviewed drawing revisions. Watches are checked on local reload. Automated official-portal monitoring, verified title, survey-grade mapping and statewide coverage require additional data access and review. Keep a separate database for each local scheme configuration.

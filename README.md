<div align="center">

# KSHETRA AI · क्षेत्र

### A step toward transparent land records in India.

**Find the parcel. Read the record. Follow the evidence.**

[![Pilot checks](https://github.com/atharvtamboli/Kshetra_AI/actions/workflows/pilot.yml/badge.svg)](https://github.com/atharvtamboli/Kshetra_AI/actions/workflows/pilot.yml)
![Node.js](https://img.shields.io/badge/Node.js-24+-339933?logo=nodedotjs&logoColor=white)
![Storage](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite)
![Coverage](https://img.shields.io/badge/Sisarma-98%20khasras-24694F)
![Paid services](https://img.shields.io/badge/Paid%20services-None-24694F)

[Run the pilot](#quick-start) · [Demo walkthrough](docs/DEMO.md) · [Data provenance](DATA.md) · [Architecture](#architecture)

</div>

---

## The idea

Imagine a buyer or landholder trying to understand a khasra number from a revenue record. KshetraAI brings the recorded interests, area, historical evidence and outstanding checks into one bilingual workspace so people can ask informed questions before a land transaction.

The first working pilot covers one historical holding in **Sisarma, Girwa, Udaipur, Rajasthan**.

## See it in action

![KshetraAI parcel explorer](docs/screenshots/lookup.jpg)

![KshetraAI recorded interests](docs/screenshots/parcel.jpg)

## What is built

| Land-record research | Working capabilities |
| --- | --- |
| **Parcel explorer** | 98 archived khasras, Hindi and English search, khata and recorded institutional-name lookup |
| **Ownership evidence** | Recorded landholder and cultivator, holding share, source date, area and previous khata |
| **Map evidence** | Three linked BhuNaksha sheets, parcel filtering and field-by-field comparison |
| **Due diligence** | Source-backed government holding flag, outstanding checks and official service links |
| **Portable reports** | Bilingual downloadable PDF with field checklist and evidence references |
| **Personal workspace** | Local accounts, private saved parcels, search history and sign-out |
| **Data integrity** | SQLite storage, source control totals, access-log expiry and verified backup snapshots |

## Quick start

Requirements: **Node.js 24+**, a modern browser, and Chrome or Edge for PDF export. No API key or paid service is required.

```sh
git clone https://github.com/atharvtamboli/Kshetra_AI.git
cd Kshetra_AI
npm start
```

Open **http://127.0.0.1:3000**. On Windows, double-click **Start-KshetraAI.cmd** to create the local environment file and launch the app. For a guided walkthrough, start with khasra **1811/5299**.

## Architecture

Every indexed parcel has a village-level locator. Select **Load village map** on its record page to open an interactive OpenStreetMap view of Sisarma. The reference point (24.573150 N, 73.653100 E) is published in the [BBNL village table](https://bbnl.nic.in/admnis/admin/showimg.aspx?ID=982). It identifies the village, while precise parcel locations and boundaries remain unverified. Follow the [official Rajasthan GIS](https://rajdharaa.rajasthan.gov.in/citizenudh/index) link to search the full khasra, and check the linked cadastral sheet when available. Map tiles require internet access.

```mermaid
flowchart TD
    A["English / Hindi browser"] --> B["Node.js HTTP server"]
    B --> C["Parcel lookup and source comparison"]
    B --> D["Account and saved parcel services"]
    C --> E["SQLite archive"]
    D --> E
    F["Jamabandi CSV and map references"] --> E
    C --> G["Printable reports / PDF"]
    E --> H["Verified backup"]
```

| Directory | Responsibility |
| --- | --- |
| src/ | Search, validation, rendering and PDF export |
| public/ | Responsive styles and legacy launch pages |
| records/ | Historical parcel facts and source metadata |
| scripts/ | Backup tooling |
| tests/ | Archive, account and recovery regression checks |
| docs/ | Demo, operations and screenshots |
| var/ | Private local database and runtime files, excluded from Git |

## Test and operate

```sh
npm test
npm run backup
```

Start the app before using the backup command. The service exposes /healthz for a database readability check. See [local operations](docs/OPERATIONS.md) for configuration, privacy and recovery.

## From village pilot to Rajasthan

### Final demo walkthrough

1. Search for khasra `1811/5299` or `2252` to see recorded interests, area and source dates.
2. Open **Load village map** to explore the Sisarma locality; the official portal and cadastral sheet links support further verification.
3. Open **Compare** and choose three khasras to review the recorded area, landholder, classification, source agreement and outstanding checks side by side.
4. Open **Coverage** to inspect the actual 98-parcel archive, area totals, dated sources, classifications and evidence gaps.
5. Use the field checklist and printable or PDF record to document the next verification steps.

Historical comparisons classify fields as matching, differing or unavailable from independent copies. They do not establish current ownership. The application continues to use a village-scoped composite key in SQLite; importing further villages requires validated source records and village-aware views.

The current archive contains 98 khasras totaling 910.3300 hectares under khata 905. Three records have independently linked cadastral sheets. Their source dates are visible throughout the app.

Next milestones are a fresh authorised revenue extract, matching georeferenced boundaries, repeatable record-change checks and a reviewed deployment. Current title, litigation, possession and conversion remain unverified. See the [data inventory](DATA.md) for scope and outstanding evidence.

---

<div align="center">

**Made for India. Built around evidence.**

</div>



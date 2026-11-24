# Sisarma pilot release readiness

## Release scope

Historical land-record research demo, version 0.2.0. Search 98 khasras, compare three parcels, view dated sources, use the optional village map, and generate bilingual reports.

- Node.js 24+; run `npm start`. Use `Start-KshetraAI.cmd` on Windows.
- Review archive control totals (98 records, 910.3300 ha), three linked cadastral sheets, and precision labels.
- Verify saved parcels and account isolation, run `npm run backup` with the app running, and rehearse recovery on a separate database.
- Print or export the record in both languages. Browser-rendered PDF check: `node tests/pdf-browser.cjs`.
- Open the optional map only when internet is available; the BBNL reference is village-level.

## Validation

Reviewed main commit f405c0548c554ca9d430bf79f3d26cef036b7d9c. Local npm tests and actual English/Hindi browser-rendered PDFs passed. The final demo PR's GitHub Actions checks passed on Linux and Windows.

## Gates before deployment

Current authorized land records, accurate parcel geometry and official demarcation, validated multi-village imports and periodic record-change monitoring, legal review of source rights and privacy, backup/restore drills, hosting and access control review. Historical matches are evidence, not current title certification. No exact GPS parcel boundaries are currently verified.

# Demo walkthrough

1. Start the server using the Windows launcher or npm start.
2. Open http://127.0.0.1:3000. Browse 98 archived parcels or select With map sheet to narrow to three.
3. Search for 1811/5299. Review recorded interests, khata 905, 8.7500 ha, and the source-backed government holding entry.
4. Explore the complete khata. Open the comparison and review fields present in each copy.
5. Open the original map sheet and field checklist. Inspect the date and outstanding questions.
6. Download the PDF in English or Hindi.
7. Create a local account, save the parcel, and view or clear your search history.
8. Switch to Hindi and repeat the lookup with Hindi digits.

Try khasra 1463 for a record without a linked map sheet or 99999 for a search outside the archive. These paths demonstrate coverage limits.

## Developer checks

Run npm test for archive totals, account isolation, persistence and tested backup recovery. Use npm run backup while the service is running. See [operations](OPERATIONS.md) and [data provenance](../DATA.md).

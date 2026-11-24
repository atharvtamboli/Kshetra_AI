## Local account data

Local accounts use a username, scrypt password hash and expiring HTTP-only session cookies. Read-only searches can be made anonymously. Signed-in users can clear their last 20 search entries and remove saved parcels. Parcel access logs expire after 30 days while the service is running. Secret or live portal tokens are not required by this archive edition.

## Next milestone

Import a current, authorised village-level jamabandi and matching georeferenced cadastral vectors. Check village identity, parcel subdivisions, coordinate reference system and vintage before enabling point-in-polygon lookup, neighbour labels and area comparisons. Additional tehsils, live government login, change alerts and production release remain pending.


## Project layout and operations

The entry point is server.js. Application logic and HTML views are under src/, browser assets are under public/, archived evidence is under records/, and regression tests are under tests/. The original HTML launch links live under public/legacy/. Private runtime data stays under var/.

Use npm run backup for a consistent SQLite snapshot while the service is running. Copies in var/backups/ contain account and session data and need the same protection as the live database. To rehearse a restore, stop the app and set DATABASE_PATH to a separate copy of the verified backup in .env, then start the app and check saved records. Preserve the existing database and its WAL files during recovery.

GET /healthz checks database readability. Its historical coverage label describes the local archive. Live government service availability is untested. Public deployment requires a separate deployment and privacy review.


CKW v33.38 — Table Tennis Official Forms
1. Stop dev server; backup/commit current working tree.
2. Copy only apply-v33.38.cjs to project root and run node apply-v33.38.cjs.
3. npm run build. If STOP or errors, do not force install.
4. Apply SQL migration 052 in a test DB first, then after backup in actual Supabase.
5. npm run dev; open /group-sports/table-tennis?tab=registration.
6. Test a school account with approved test data: single, doubles, mixed, saving and photo retry; print five photo forms and six age/sex roster variants.
No env file, shared roster RPC or other sport forms changed. New isolated tables are RLS enabled and accessible through school/admin checked RPCs.
No athlete master yet. Photos remain per entry; no automatic reuse. Age cutoff dates and conflicting total limits in source are not automatically enforced; verify eligibility with organizer. Duplicate check uses normalized name within school and age band, not a unique athlete ID. Roster for age 15 is an adaptation of duplicate age 13 page in original. Actual DB, browser print, Excel and production build untested in this environment.
Remove apply-v33.38.cjs from repository before commit; keep migration in supabase/migrations.

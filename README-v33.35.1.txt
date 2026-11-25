v33.35.1 Basketball official fields (cumulative v33.35)
1. Back up database; run included SQL in Supabase SQL Editor (only basketball register validation; no data changes).
2. Copy only apply-v33.35.1.cjs to project root, run node apply-v33.35.1.cjs. If STOP, do not force.
3. npm run build, npm run dev. Test with authorized test environment before deployment.
4. New Excel only name/prefix/jersey. Existing optional fields remain in DB and are carried on edits with matching names; not required for new rows. Old Excel imports use only required fields.
5. Age qualification still needs on-site verification per official rules. Staff photos are not requested in form; existing photo manager remains available.
6. Print pages unchanged from v33.35; no changes to other sports or .env.local.

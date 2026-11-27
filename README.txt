Volleyball optional reserve rows — targeted UI patch
Copy only src/ into student-activity-app. Back up the current VolleyballRegistration.tsx first.
No SQL migration, no registration status change. Based on project archive v33.38 and migration 050.
The first 6 player slots remain mandatory. Slots 7–12 are optional if entirely blank; partially filled slots are validated. Existing coach requirements remain unchanged (1 coach required, assistants optional, assistant 1 before assistant 2).
Excel import already skips blank rows and is unchanged. Existing permissions, database functions and print templates are unchanged.
Local checks: TypeScript transpile syntax and isolated roster filter/validator tests passed. Full build and live Supabase submission not tested.
Test npm run build, then use a test database or an actual intended new school application. Localhost can point at production; do not submit dummy applications there.

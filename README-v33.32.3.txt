CKW v33.32.3 — Smart Registration Hub
Base: v33.32.2, including the v33.32.1 results hub changes.

1. Commit your verified v33.32.2 to main (backup). Stop npm run dev (Ctrl+C).
2. Copy the src folder into D:\ระบบ\student-activity-app, merge folders, replace GroupSportsDashboard.tsx. If edited since v33.32.2, compare before replacement.
3. Copy apply-registration-links-v33.32.3.cjs to the project root. In the project terminal run:
   node apply-registration-links-v33.32.3.cjs
   The script checks all 6 exact anchors before modifying existing sport files, preserves other code, and can be rerun. If STOP, do not force; send the message. Move the temporary script out of the repository after success.
4. npm run build; then npm run dev
5. http://localhost:3000/group-sports?section=registration
No SQL, dependency changes, commit or push performed by the script.

Scope: ten cards, school/sport/event filters, visible central application counts (not unique athletes), seven central sport-scoped forms, existing three specialist forms, private roster printing up to 50 applications per batch, name/prefix and newly selected photo completion hints, on-demand duplicate/identical start-time advisory for central forms.
The advisory checks readable existing applications of the selected school; exact student codes take priority, same names without codes are possible matches only. Does not detect all overlap/duration, unpublished or unknown schedules, inaccessible entries, or cross-school identity. It does not block registrations or change eligibility. The audit is not added to the three specialist forms in this patch. Existing photos and backend validation remain unchanged. Count pagination can increase read requests; review Supabase usage. Existing RLS/RPC remains authoritative.
Verify with an authorized school and a different school account. Do not submit actual test registrations unless explicitly intended. Production Build, browser visual check and Supabase permissions are not executed here.

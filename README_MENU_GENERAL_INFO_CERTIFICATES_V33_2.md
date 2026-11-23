# v33.2 — Move certificates into the General Information menu

## What changed

- Rename the main Group Sports dashboard navigation label **ข้อมูลสำหรับโรงเรียน** to **ข้อมูลทั่วไป**.
- Add **เกียรติบัตร** at the end of its expandable submenu.
- Remove the previous standalone certificate banner under the main navigation.
- The submenu certificate item links to the existing route `/group-sports/certificates`; it uses the same authorisation and features as v33.1.
- The existing school information, parade information, schedule, registration, and sports pages remain unchanged.

## Install (on top of v33.1)

Copy `src/components/group-sports/GroupSportsDashboard.tsx` into the same path in your project. You can also copy the optional regression test from `tests/group-sports-menu-v33-2.test.mjs`.

Run:

```bash
node --test tests/group-sports-menu-v33-2.test.mjs
npm run build
```

After a successful build, commit and push to deploy on Vercel. Verify on both desktop and mobile that **ข้อมูลทั่วไป → เกียรติบัตร** opens the existing certificate dashboard.

**No Supabase SQL or migration change is required.**

Note: This patch has passed syntax and source-level regression checks; a full Next.js production build and in-browser functional test require the dependencies and connected environment available in your deployment.

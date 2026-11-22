# Hotfix V7 – Next.js cacheComponents build error

## Cause
Next.js 16.4.2 is configured with `cacheComponents: true`. The school-login API routes added in v7 export legacy route segment settings `runtime = "nodejs"` and `dynamic = "force-dynamic"`, which Next.js rejects.

## Files changed
- src/app/api/group-sports/login/route.ts
- src/app/api/group-sports/school-accounts/route.ts
- src/app/api/group-sports/school-accounts/[id]/route.ts

Both incompatible exports were removed from each file. The logic, role checks, Supabase calls, and `Cache-Control: no-store` response header were left unchanged.

## Apply
Unzip the patch in your project root, preserving the top-level `student-activity-app/` structure (or copy the three matching `route.ts` files into your existing project). Commit, push, and check the Vercel Build Logs again. No new SQL migrations or environment variables are required for this hotfix.

## Verification
Validated all three modified files and scanned the full zipped project for unsupported `export const runtime` or `export const dynamic` declarations. A full Next.js production build could not be run here because the installed Next.js dependencies are incomplete.

# V18 PDF Print TypeScript Hotfix

Build error fixed: `TS7006: Parameter 'coach' implicitly has an 'any' type` in
`src/app/group-sports/print/page.tsx`.

Install the patch by extracting to the root folder of your current v18 project.
It changes only the print page. No SQL migrations or environment variables needed.
Commit and push, then check Vercel build logs and test printing an RoV application.

Validation performed: isolated strict TypeScript check of the coach guard and
TSX transpile of the print page. Full Next.js build was not available in the
local environment because project dependencies were not installed.

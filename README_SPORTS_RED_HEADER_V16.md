# Sports red-and-white banner / Header v16

This update is for the `student-activity-app` project v15. It changes the group sports header only.

Files changed:
- `src/components/group-sports/GroupSportsDashboard.tsx`
- `public/images/group-sports-hero-rov.png`

Implementation details:
- Illustrations (runners, stadium, sports icons including RoV) are cropped from the previously generated artwork and rendered as an ornamental right-side background only on large screens.
- Real title, competition year, back link, school login/logout and admin header actions remain HTML/Next.js components. Thus no dead or duplicate image-based buttons.
- Red/white theme with mobile gradient fallback; avoids white top/bottom margins from full generated image.
- No SQL migrations or Environment Variables required.

Install:
1. Copy both paths from the patch into the project, preserving folder structure.
2. Commit and push to GitHub.
3. Check Vercel Preview before merging/promoting to Production.
4. Verify header on desktop and mobile, user logged out and logged in.

Note: This patch is prepared from supplied v15 code and has not been deployed to your Vercel project.

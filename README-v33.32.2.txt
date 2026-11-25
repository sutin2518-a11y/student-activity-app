v33.32.2 — Athletics Registration Focus
Based on v33.32.1 Results Hub Fix and v33.31.5 AthleticsDashboard.
Copy src into existing project (merge folders). Only two TSX files replaced. No SQL.
Check /group-sports/athletics > ลงทะเบียนนักกีฬา: central form opens with athletics-only event options for authorized school/admin; saved applications are athletics-only. Other users see existing login guidance. Use ลงทะเบียนทุกกีฬา to exit filter.
No changes to database, save RPC, validation rules or role permissions.
Run npm run build then npm run dev. Verify standard registration and results hub too.

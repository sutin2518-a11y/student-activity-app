CKW v33.33.4 — Compact sport hubs
Copy only apply-v33.33.4.cjs to project root (next to package.json).
Run: node apply-v33.33.4.cjs
The installer checks both dashboard labels and layout import, backs up CSS to OS temp, and appends screen-only scoped CSS to sports-multicolor-theme.css. No database, secrets, football forms or other files changed.
Desktop registration: 5 columns >=1200 CSS px; 3 >=900; 2 below. Results: compact rows with right aligned equal width blue buttons >=640; stacked on narrow phones.
Delete installer from project root after success; do not commit it. Run npm run build and npm run dev. Verify both hubs and football form. If needed revert only appended CSS section using the backup or Git diff.

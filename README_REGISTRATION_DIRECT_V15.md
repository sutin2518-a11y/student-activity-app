# Student Activity — Group Sports registration UI update v15

- Clicking **ลงทะเบียน** now opens the new registration form automatically, above existing registrations. Re-clicking the selected tab does not reset a partially completed form.
- A **＋ ลงทะเบียนรายการใหม่** button appears within the registration list when the form is closed, for another registration.
- Removed **↻ รีเฟรชข้อมูล**, header **＋ ลงทะเบียนทีม**, and normal **เชื่อมต่อฐานข้อมูล** badge. The demo-mode warning remains visible if applicable.
- No database schema, API, auth, or environment-variable changes.

For deployment: Commit and push, then test in Vercel Preview with a school account. No SQL migration required.

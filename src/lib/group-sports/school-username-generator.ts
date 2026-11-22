/** Readable organizer-issued usernames. Uniqueness is always enforced by SQL. */
export function nextSchoolUsername(used: ReadonlySet<string>): string {
  for (let index = 1; index <= 999999; index++) {
    const candidate = `py${String(index).padStart(3, "0")}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("ไม่มี Username ว่างสำหรับสร้างบัญชีเพิ่มเติม");
}

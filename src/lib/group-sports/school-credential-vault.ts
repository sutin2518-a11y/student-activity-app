/** Server-only encrypted custody of organizer-issued school credentials.
 * Password authentication remains with Supabase Auth, which stores its own hash.
 * The vault is strictly optional at the platform level but required for provisioning
 * through the v10 organizer interface, so new credentials are recoverable by admins.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type EncryptedPassword = { ciphertext: string; iv: string; auth_tag: string };

function keyFromEnvironment(): Buffer {
  const value = (process.env.SPORTS_ACCOUNT_VAULT_KEY || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("ตั้งค่า SPORTS_ACCOUNT_VAULT_KEY เป็นคีย์ Hex 64 ตัวอักษรใน Vercel ก่อนสร้างหรือดูรหัสผ่านบัญชีโรงเรียน");
  }
  return Buffer.from(value, "hex");
}

export function assertCredentialVaultReady(): void {
  keyFromEnvironment();
}

export function encryptSchoolPassword(password: string, accountId: string): EncryptedPassword {
  const key = keyFromEnvironment();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`sports-school-password:v1:${accountId}`, "utf8"));
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return { ciphertext: encrypted.toString("base64"), iv: iv.toString("base64"), auth_tag: cipher.getAuthTag().toString("base64") };
}

export function decryptSchoolPassword(record: EncryptedPassword, accountId: string): string {
  const decipher = createDecipheriv("aes-256-gcm", keyFromEnvironment(), Buffer.from(record.iv, "base64"));
  decipher.setAAD(Buffer.from(`sports-school-password:v1:${accountId}`, "utf8"));
  decipher.setAuthTag(Buffer.from(record.auth_tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

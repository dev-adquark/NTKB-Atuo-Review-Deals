import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const secret = process.env.CONTENT_ENGINE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("CONTENT_ENGINE_ENCRYPTION_KEY is not configured");
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypts a secret (e.g. an external API key) for storage at rest. Server-only. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/** Masks a secret for display in the admin UI. Never send the plaintext to the client. */
export function maskSecret(plaintext: string): string {
  if (!plaintext) return "";
  if (plaintext.length <= 4) return "••••";
  return `••••${plaintext.slice(-4)}`;
}

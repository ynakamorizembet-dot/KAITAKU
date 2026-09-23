import crypto from "crypto";

// api_keys.encrypted_key に保存する値の暗号化・復号ユーティリティ。
// AES-256-GCM: IV(12byte) + 認証タグ(16byte) + 暗号文 を連結してbase64で1本の文字列として保存する。
// 鍵は環境変数 ENCRYPTION_KEY(32byte・base64)のみが握り、DBには一切保存しない。
// このファイルはサーバー側(Server Actions / Route Handlers)からのみ呼び出すこと。
// クライアントコンポーネントや "use client" ファイルからは絶対にimportしない。

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY が設定されていません。.env.local / Vercelの環境変数を確認してください。"
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY は32byte(base64エンコード)である必要があります。"
    );
  }
  return key;
}

// 平文を暗号化してbase64文字列を返す。api_keys.encrypted_key にそのまま保存する。
export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

// encryptSecret で保存した値を平文に戻す。APIを実際に呼び出す直前のサーバー側でのみ使うこと。
export function decryptSecret(stored: string): string {
  const key = getKey();
  const data = Buffer.from(stored, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

// 鍵ローテーション等の動作確認用。本番コードからは呼ばない。
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("base64");
}

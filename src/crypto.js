/* global Zotero, Components, crypto, TextEncoder, TextDecoder, btoa, atob, PathUtils, IOUtils */

var EixosCrypto = (function () {
  const NSS_PREFIX = "nss-sdr:v1:";
  const AES_PREFIX = "aes-gcm:v1:";
  const VAULT_KEY_FILENAME = ".organizer-vault.key";

  function getSecretDecoderRing() {
    try {
      if (
        typeof Components !== "undefined" &&
        Components.classes &&
        Components.classes["@mozilla.org/security/sdr;1"] &&
        Components.interfaces &&
        Components.interfaces.nsISecretDecoderRing
      ) {
        return Components.classes["@mozilla.org/security/sdr;1"].getService(
          Components.interfaces.nsISecretDecoderRing
        );
      }
    } catch (e) {}
    return null;
  }

  function bytesToBase64(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    if (typeof btoa === "function") return btoa(bin);
    if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
    throw new Error("Base64 encoder unavailable");
  }

  function base64ToBytes(b64) {
    if (typeof atob === "function") {
      const bin = atob(b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(b64, "base64"));
    }
    throw new Error("Base64 decoder unavailable");
  }

  function getWebCrypto() {
    if (typeof crypto !== "undefined" && crypto && crypto.subtle) return crypto;
    if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
      return globalThis.crypto;
    }
    return null;
  }

  function getVaultKeyPath() {
    try {
      if (typeof Zotero !== "undefined" && Zotero.Profile && Zotero.Profile.dir) {
        if (typeof PathUtils !== "undefined" && typeof PathUtils.join === "function") {
          return PathUtils.join(Zotero.Profile.dir, VAULT_KEY_FILENAME);
        }
        const sep = Zotero.Profile.dir.includes("\\") ? "\\" : "/";
        return Zotero.Profile.dir.replace(/[\\/]+$/, "") + sep + VAULT_KEY_FILENAME;
      }
    } catch (e) {}
    return null;
  }

  async function readOrCreateLocalAesKeyBytes(createIfMissing) {
    const keyPath = getVaultKeyPath();
    if (!keyPath || typeof IOUtils === "undefined") {
      return null;
    }
    try {
      const exists = await IOUtils.exists(keyPath);
      if (exists) {
        const rawB64 = (await IOUtils.readUTF8(keyPath)).trim();
        const bytes = base64ToBytes(rawB64);
        if (bytes.length === 32) return bytes;
      }
    } catch (e) {}

    if (!createIfMissing) return null;

    const wc = getWebCrypto();
    if (!wc) return null;
    const keyBytes = new Uint8Array(32);
    wc.getRandomValues(keyBytes);
    await IOUtils.writeUTF8(keyPath, bytesToBase64(keyBytes));
    try {
      if (typeof IOUtils.setPermissions === "function") {
        await IOUtils.setPermissions(keyPath, 0o600);
      }
    } catch (e) {}
    return keyBytes;
  }

  /**
   * Synchronous decrypt helper for NSS SDR ciphertexts (used by sync callers if needed).
   */
  function decryptSyncIfSupported(stored) {
    const val = String(stored || "").trim();
    if (!val) return "";
    if (val.startsWith(NSS_PREFIX)) {
      const sdr = getSecretDecoderRing();
      if (!sdr) return "";
      try {
        return String(sdr.decryptString(val.slice(NSS_PREFIX.length)) || "").trim();
      } catch (e) {
        return "";
      }
    }
    return "";
  }

  /**
   * Encrypts a secret locally using:
   * 1) Gecko/Zotero native NSS Secret Decoder Ring (key4.db — AES-256), OR
   * 2) WebCrypto AES-256-GCM with a random 256-bit key stored in the local Zotero profile.
   * Never returns plaintext.
   */
  async function encryptSecret(plaintext) {
    const clean = String(plaintext || "").trim();
    if (!clean) {
      return { encoded: "", method: "none" };
    }

    // Layer 1: Native Gecko NSS Secret Decoder Ring (key4.db)
    const sdr = getSecretDecoderRing();
    if (sdr) {
      try {
        const cipher = sdr.encryptString(clean);
        if (cipher && cipher !== clean) {
          return { encoded: NSS_PREFIX + cipher, method: "nss-sdr" };
        }
      } catch (e) {
        if (typeof Zotero !== "undefined" && Zotero.debug) {
          Zotero.debug("EixosCrypto: NSS SDR encrypt failed, falling back to AES-256-GCM.");
        }
      }
    }

    // Layer 2: WebCrypto AES-256-GCM with local 256-bit profile key
    const wc = getWebCrypto();
    if (wc) {
      const keyBytes = await readOrCreateLocalAesKeyBytes(true);
      if (keyBytes) {
        const cryptoKey = await wc.subtle.importKey(
          "raw",
          keyBytes,
          { name: "AES-GCM" },
          false,
          ["encrypt"]
        );
        const iv = new Uint8Array(12);
        wc.getRandomValues(iv);
        const encodedPlain = new TextEncoder().encode(clean);
        const cipherBuf = await wc.subtle.encrypt(
          { name: "AES-GCM", iv },
          cryptoKey,
          encodedPlain
        );
        const cipherBytes = new Uint8Array(cipherBuf);
        return {
          encoded: `${AES_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(cipherBytes)}`,
          method: "aes-gcm",
        };
      }
    }

    throw new Error("Local cryptographic provider unavailable (NSS SDR / AES-256-GCM).");
  }

  /**
   * Decrypts a secret stored by encryptSecret().
   */
  async function decryptSecret(stored) {
    const val = String(stored || "").trim();
    if (!val) return "";

    if (val.startsWith(NSS_PREFIX)) {
      const sdr = getSecretDecoderRing();
      if (!sdr) return "";
      try {
        return String(sdr.decryptString(val.slice(NSS_PREFIX.length)) || "").trim();
      } catch (e) {
        return "";
      }
    }

    if (val.startsWith(AES_PREFIX)) {
      const wc = getWebCrypto();
      if (!wc) return "";
      const parts = val.slice(AES_PREFIX.length).split(":");
      if (parts.length !== 2) return "";
      try {
        const keyBytes = await readOrCreateLocalAesKeyBytes(false);
        if (!keyBytes) return "";
        const cryptoKey = await wc.subtle.importKey(
          "raw",
          keyBytes,
          { name: "AES-GCM" },
          false,
          ["decrypt"]
        );
        const iv = base64ToBytes(parts[0]);
        const cipherBytes = base64ToBytes(parts[1]);
        const plainBuf = await wc.subtle.decrypt(
          { name: "AES-GCM", iv },
          cryptoKey,
          cipherBytes
        );
        return new TextDecoder().decode(plainBuf).trim();
      } catch (e) {
        return "";
      }
    }

    return "";
  }

  function detectStorageMethod(stored) {
    const val = String(stored || "").trim();
    if (!val) return "none";
    if (val.startsWith(NSS_PREFIX)) return "nss-sdr";
    if (val.startsWith(AES_PREFIX)) return "aes-gcm";
    return "unknown";
  }

  /**
   * Redacts any API keys or bearer tokens from strings before logging or displaying errors.
   */
  function sanitizeErrorText(text) {
    return String(text || "")
      .replace(/([?&]key=)[^&\s"']+/gi, "$1***")
      .replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, "$1***")
      .replace(/\bAIza[0-9A-Za-z\-_]{16,}\b/g, "AIza***")
      .replace(/\bsk-[A-Za-z0-9\-_]{16,}\b/g, "sk-***");
  }

  return {
    NSS_PREFIX,
    AES_PREFIX,
    encryptSecret,
    decryptSecret,
    decryptSyncIfSupported,
    detectStorageMethod,
    sanitizeErrorText,
  };
})();

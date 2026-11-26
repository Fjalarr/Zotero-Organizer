/* global Zotero, EixosCrypto */

var EixosConfig = (function () {
  const PREF_PREFIX = "extensions.eixosOrganizer.";
  const SYNC_NOTE_TAG = "_eixos_organizer_config";
  const SYNC_NOTE_TITLE = "[Organizer] Configuração Sincronizada (não apagar)";
  const CONFIG_SCHEMA_VERSION = 1;

  // Private in-memory cache of the decrypted API key (never exported, synced, or logged)
  let cachedApiKey = "";
  let apiKeyHydrated = false;

  const DEFAULTS = {
    language: "auto", // "auto" | "pt-BR" | "en-US"
    mode: "auto", // "auto" | "interactive"
    engine: "hybrid", // "hybrid" | "ai" | "offline"
    aiProvider: "gemini", // "gemini" | "openai" | "custom"
    aiApiKey: "", // Legacy plaintext pref (auto-migrated & wiped on startup)
    aiApiKeyEnc: "", // Encrypted local-only ciphertext (NSS SDR or AES-256-GCM)
    aiModel: "gemini-3.5-flash",
    aiEndpoint: "http://localhost:11434/v1/chat/completions",
    allowCreateNew: true,
    enableSubthemes: true,
    subthemeMinItems: 4,
    maxTargets: 3,
    skipAlreadyClassified: true,
    syncConfigInLibrary: true,
    rulesJson: "[]",
  };

  function getPref(key) {
    try {
      const val = Zotero.Prefs.get(PREF_PREFIX + key, true);
      if (val === undefined || val === null) {
        return DEFAULTS[key];
      }
      return val;
    } catch (e) {
      return DEFAULTS[key];
    }
  }

  function setPref(key, value) {
    Zotero.Prefs.set(PREF_PREFIX + key, value, true);
  }

  function clearPref(key) {
    try {
      Zotero.Prefs.set(PREF_PREFIX + key, "", true);
    } catch (e) {}
    try {
      if (typeof Zotero.Prefs.clear === "function") {
        Zotero.Prefs.clear(PREF_PREFIX + key, true);
      }
    } catch (e) {}
  }

  function getApiKeyStorageMethod() {
    const enc = String(getPref("aiApiKeyEnc") || "").trim();
    if (!enc) return "none";
    if (typeof EixosCrypto !== "undefined" && typeof EixosCrypto.detectStorageMethod === "function") {
      return EixosCrypto.detectStorageMethod(enc);
    }
    return "unknown";
  }

  /**
   * Hydrates the in-memory decrypted API key from encrypted local storage.
   * Automatically migrates and wipes any legacy plaintext `aiApiKey` preference.
   */
  async function ensureApiKeyLoaded() {
    const legacyPlain = String(getPref("aiApiKey") || "").trim();
    const enc = String(getPref("aiApiKeyEnc") || "").trim();

    if (legacyPlain) {
      try {
        if (!enc) {
          const res = await EixosCrypto.encryptSecret(legacyPlain);
          setPref("aiApiKeyEnc", res.encoded);
          cachedApiKey = legacyPlain;
        }
      } catch (e) {
        Zotero.debug("EixosConfig: failed to migrate legacy API key.");
      } finally {
        clearPref("aiApiKey");
      }
    }

    const latestEnc = String(getPref("aiApiKeyEnc") || "").trim();
    if (latestEnc && typeof EixosCrypto !== "undefined") {
      cachedApiKey = await EixosCrypto.decryptSecret(latestEnc);
    } else if (!legacyPlain) {
      cachedApiKey = "";
    }
    apiKeyHydrated = true;
    return cachedApiKey;
  }

  async function saveApiKey(rawKey) {
    const clean = String(rawKey || "").trim();
    // Always wipe any legacy plaintext preference immediately
    clearPref("aiApiKey");

    if (!clean) {
      clearPref("aiApiKeyEnc");
      cachedApiKey = "";
      apiKeyHydrated = true;
      return { method: "none" };
    }

    const res = await EixosCrypto.encryptSecret(clean);
    setPref("aiApiKeyEnc", res.encoded);
    cachedApiKey = clean;
    apiKeyHydrated = true;
    return { method: res.method };
  }

  async function clearApiKey() {
    return saveApiKey("");
  }

  function readCachedOrSyncApiKey() {
    if (apiKeyHydrated) return cachedApiKey;
    const enc = String(getPref("aiApiKeyEnc") || "").trim();
    if (enc && typeof EixosCrypto !== "undefined" && typeof EixosCrypto.decryptSyncIfSupported === "function") {
      const dec = EixosCrypto.decryptSyncIfSupported(enc);
      if (dec) {
        cachedApiKey = dec;
        apiKeyHydrated = true;
        return cachedApiKey;
      }
    }
    return cachedApiKey;
  }

  function getSettings() {
    let rules = [];
    try {
      rules = JSON.parse(getPref("rulesJson") || "[]");
      if (!Array.isArray(rules)) rules = [];
    } catch (e) {
      rules = [];
    }
    return {
      language: getPref("language") || "auto",
      mode: getPref("mode") || "auto",
      engine: getPref("engine") || "hybrid",
      aiProvider: getPref("aiProvider") || "gemini",
      aiApiKey: readCachedOrSyncApiKey(),
      aiApiKeyMethod: getApiKeyStorageMethod(),
      aiModel: String(getPref("aiModel") || "").trim(),
      aiEndpoint: String(getPref("aiEndpoint") || DEFAULTS.aiEndpoint).trim(),
      allowCreateNew: Boolean(getPref("allowCreateNew")),
      enableSubthemes: getPref("enableSubthemes") !== false,
      subthemeMinItems: Math.max(2, Math.min(20, Number(getPref("subthemeMinItems")) || 4)),
      maxTargets: Math.max(1, Math.min(8, Number(getPref("maxTargets")) || 3)),
      skipAlreadyClassified: Boolean(getPref("skipAlreadyClassified")),
      syncConfigInLibrary: Boolean(getPref("syncConfigInLibrary")),
      rules,
    };
  }

  async function getSettingsAsync() {
    await ensureApiKeyLoaded();
    return getSettings();
  }

  function saveLocalSettings(partial) {
    // Note: aiApiKey is intentionally EXCLUDED here; it MUST be saved via saveApiKey() (encrypted)
    const allowed = [
      "language",
      "mode",
      "engine",
      "aiProvider",
      "aiModel",
      "aiEndpoint",
      "allowCreateNew",
      "enableSubthemes",
      "subthemeMinItems",
      "maxTargets",
      "skipAlreadyClassified",
      "syncConfigInLibrary",
    ];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(partial, k)) {
        setPref(k, partial[k]);
      }
    }
    if (Array.isArray(partial.rules)) {
      setPref("rulesJson", JSON.stringify(partial.rules));
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function unescapeHtml(str) {
    return String(str)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  async function findSyncConfigNote(libraryID) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const rows = await Zotero.DB.columnQueryAsync(
      `SELECT i.itemID
       FROM items i
       JOIN itemTypes it ON it.itemTypeID = i.itemTypeID
       JOIN itemTags itg ON itg.itemID = i.itemID
       JOIN tags t ON t.tagID = itg.tagID
       WHERE i.libraryID = ?
         AND it.typeName = 'note'
         AND t.name = ?
         AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
       ORDER BY i.dateModified DESC`,
      [libID, SYNC_NOTE_TAG]
    );
    if (!rows || rows.length === 0) return null;
    for (const itemID of rows) {
      const item = await Zotero.Items.getAsync(itemID);
      if (item && !item.deleted && item.isNote() && !item.parentItemID) {
        return item;
      }
    }
    return null;
  }

  function extractPayloadFromNoteHtml(html) {
    if (!html) return null;
    const match = html.match(/<pre[^>]*data-eixos-config="1"[^>]*>([\s\S]*?)<\/pre>/i);
    const raw = match ? match[1] : html.replace(/<[^>]+>/g, "\n");
    const decoded = unescapeHtml(raw).trim();
    const start = decoded.indexOf("{");
    const end = decoded.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      const parsed = JSON.parse(decoded.slice(start, end + 1));
      if (parsed && Array.isArray(parsed.rules)) {
        return parsed;
      }
    } catch (e) {
      Zotero.debug("EixosConfig: failed to parse sync note JSON: " + e);
    }
    return null;
  }

  function buildSyncNoteHtml(payload) {
    const pretty = JSON.stringify(payload, null, 2);
    return (
      `<h1>${escapeHtml(SYNC_NOTE_TITLE)}</h1>` +
      `<p>Esta nota guarda o mapeamento de pastas gerenciadas pelo plugin <strong>Eixos Organizer</strong> para sincronização automática entre computadores/usuários desta biblioteca. <strong>Nenhuma chave de API é salva aqui.</strong></p>` +
      `<pre data-eixos-config="1">${escapeHtml(pretty)}</pre>`
    );
  }

  async function saveRulesToSyncNote(rules, libraryID) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const settings = getSettings();
    const payload = {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      defaultAllowCreateNew: settings.allowCreateNew,
      defaultMaxTargets: settings.maxTargets,
      rules: normalizeRules(rules),
    };

    let note = await findSyncConfigNote(libID);
    if (!note) {
      note = new Zotero.Item("note");
      note.libraryID = libID;
      note.addTag(SYNC_NOTE_TAG);
    }
    note.setNote(buildSyncNoteHtml(payload));
    await note.saveTx();
    return payload;
  }

  async function loadRulesFromSyncNote(libraryID) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const note = await findSyncConfigNote(libID);
    if (!note) return null;
    const payload = extractPayloadFromNoteHtml(note.getNote());
    if (!payload) return null;
    const rules = normalizeRules(payload.rules);
    setPref("rulesJson", JSON.stringify(rules));
    return payload;
  }

  function normalizeRules(rules) {
    if (!Array.isArray(rules)) return [];
    const seen = new Set();
    const clean = [];
    for (const r of rules) {
      if (!r || !r.sourceKey || !r.targetRootKey) continue;
      if (r.sourceKey === r.targetRootKey) continue;
      const sig = `${r.libraryID || 1}:${r.sourceKey}->${r.targetRootKey}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      clean.push({
        id: r.id || `rule_${r.sourceKey}_${r.targetRootKey}`,
        enabled: r.enabled !== false,
        libraryID: Number(r.libraryID) || Zotero.Libraries.userLibraryID,
        sourceKey: String(r.sourceKey).trim(),
        targetRootKey: String(r.targetRootKey).trim(),
        allowCreateNew: r.allowCreateNew !== undefined ? Boolean(r.allowCreateNew) : true,
        label: String(r.label || "").trim(),
      });
    }
    return clean;
  }

  /**
   * Auto-discovers pairs:
   * 1. Sibling: "<Name>" and "<Name> - Por Eixo e Tema" under the same parent.
   * 2. Nested: "<Name>" containing child "Por Eixo e Tema" or "<Name> - Por Eixo e Tema".
   */
  async function autoDiscoverRules(libraryID) {
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    const rows = await Zotero.DB.queryAsync(
      `SELECT collectionID, collectionName, parentCollectionID, key
       FROM collections
       WHERE libraryID = ?
         AND collectionID NOT IN (SELECT collectionID FROM deletedCollections)`,
      [libID]
    );
    if (!rows || rows.length === 0) return [];

    const byID = new Map();
    const byParent = new Map();
    for (const r of rows) {
      byID.set(r.collectionID, r);
      const pid = r.parentCollectionID || 0;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(r);
    }

    const norm = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    const discovered = [];

    // 1. Sibling pattern: "<Name>" -> "<Name> - Por Eixo e Tema" or "<Name> - By Axis & Theme"
    for (const siblings of byParent.values()) {
      for (const target of siblings) {
        const match = target.collectionName.match(
          /^(.+?)\s*-\s*(?:Por Eixo e Tema|By Axis\s*(?:&|and)\s*Theme)$/i
        );
        if (!match) continue;
        const baseName = norm(match[1]);
        const source = siblings.find(
          (s) => s.key !== target.key && norm(s.collectionName) === baseName
        );
        if (source) {
          discovered.push({
            id: `rule_${source.key}_${target.key}`,
            enabled: true,
            libraryID: libID,
            sourceKey: source.key,
            targetRootKey: target.key,
            allowCreateNew: true,
            label: `${source.collectionName} → ${target.collectionName}`,
          });
        }
      }
    }

    // 2. Nested child pattern: "<Source>" -> "<Source> / <Source> - Por Eixo e Tema" / "By Axis & Theme"
    for (const r of rows) {
      if (!r.parentCollectionID || !byID.has(r.parentCollectionID)) continue;
      const parent = byID.get(r.parentCollectionID);
      const rn = norm(r.collectionName);
      const pn = norm(parent.collectionName);
      if (
        rn === "por eixo e tema" ||
        rn === "por eixos e temas" ||
        rn === "by axis & theme" ||
        rn === "by axis and theme" ||
        rn === `${pn} - por eixo e tema` ||
        rn === `${pn} - by axis & theme` ||
        rn === `${pn} - by axis and theme`
      ) {
        discovered.push({
          id: `rule_${parent.key}_${r.key}`,
          enabled: true,
          libraryID: libID,
          sourceKey: parent.key,
          targetRootKey: r.key,
          allowCreateNew: true,
          label: `${parent.collectionName} → ${parent.collectionName} / ${r.collectionName}`,
        });
      }
    }

    return normalizeRules(discovered);
  }

  async function initAndSyncConfig() {
    await ensureApiKeyLoaded();
    const settings = getSettings();
    const libID = Zotero.Libraries.userLibraryID;

    if (settings.syncConfigInLibrary) {
      try {
        const synced = await loadRulesFromSyncNote(libID);
        if (synced && synced.rules && synced.rules.length > 0) {
          Zotero.debug(`EixosConfig: loaded ${synced.rules.length} rules from synced library note.`);
          return getSettings();
        }
      } catch (e) {
        Zotero.debug("EixosConfig: error loading synced note: " + e);
      }
    }

    if (settings.rules.length === 0) {
      const discovered = await autoDiscoverRules(libID);
      if (discovered.length > 0) {
        saveLocalSettings({ rules: discovered });
        if (settings.syncConfigInLibrary) {
          try {
            await saveRulesToSyncNote(discovered, libID);
          } catch (e) {
            Zotero.debug("EixosConfig: could not create initial sync note: " + e);
          }
        }
        Zotero.debug(`EixosConfig: auto-discovered ${discovered.length} rule(s).`);
      }
    }
    return getSettings();
  }

  function exportConfigJSON() {
    const s = getSettings();
    // Never export private API keys!
    return JSON.stringify(
      {
        schemaVersion: CONFIG_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        language: s.language,
        mode: s.mode,
        engine: s.engine,
        aiProvider: s.aiProvider,
        aiModel: s.aiModel,
        allowCreateNew: s.allowCreateNew,
        enableSubthemes: s.enableSubthemes,
        subthemeMinItems: s.subthemeMinItems,
        maxTargets: s.maxTargets,
        skipAlreadyClassified: s.skipAlreadyClassified,
        syncConfigInLibrary: s.syncConfigInLibrary,
        rules: s.rules,
      },
      null,
      2
    );
  }

  async function importConfigJSON(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("JSON inválido.");
    }
    const rules = normalizeRules(parsed.rules || []);
    const update = { rules };
    for (const k of [
      "language",
      "mode",
      "engine",
      "aiProvider",
      "aiModel",
      "allowCreateNew",
      "enableSubthemes",
      "subthemeMinItems",
      "maxTargets",
      "skipAlreadyClassified",
      "syncConfigInLibrary",
    ]) {
      if (parsed[k] !== undefined) {
        update[k] = parsed[k];
      }
    }
    saveLocalSettings(update);
    const current = getSettings();
    if (current.syncConfigInLibrary) {
      await saveRulesToSyncNote(current.rules);
    }
    return current;
  }

  function findRuleForSourceCollection(collectionKey, libraryID) {
    const s = getSettings();
    const libID = libraryID || Zotero.Libraries.userLibraryID;
    return (
      s.rules.find(
        (r) =>
          r.enabled &&
          r.sourceKey === collectionKey &&
          (!r.libraryID || Number(r.libraryID) === Number(libID))
      ) || null
    );
  }

  function getDefaultModelForProvider(provider) {
    if (provider === "openai") return "gpt-4o-mini";
    if (provider === "custom") return "llama3.1";
    return "gemini-3.5-flash";
  }

  return {
    SYNC_NOTE_TAG,
    DEFAULTS,
    getPref,
    setPref,
    clearPref,
    ensureApiKeyLoaded,
    saveApiKey,
    clearApiKey,
    getApiKeyStorageMethod,
    getSettings,
    getSettingsAsync,
    saveLocalSettings,
    normalizeRules,
    saveRulesToSyncNote,
    loadRulesFromSyncNote,
    autoDiscoverRules,
    initAndSyncConfig,
    exportConfigJSON,
    importConfigJSON,
    findRuleForSourceCollection,
    getDefaultModelForProvider,
  };
})();

/* global Zotero, ChromeUtils, document, window */

var EixosPrefsPane = (function () {
  let collectionsCache = [];
  let rulesState = [];
  let eventsBound = false;

  function api() {
    return Zotero.EixosOrganizer;
  }

  function t(key, params) {
    const a = api();
    if (a && a.i18n && typeof a.i18n.t === "function") {
      return a.i18n.t(key, params);
    }
    return key;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(id, msg, isError) {
    const el = $(id);
    if (!el) return;
    el.textContent = msg || "";
    el.className = "eixos-status" + (isError ? " eixos-error" : msg ? " eixos-ok" : "");
  }

  function applyLanguage() {
    const root = $("eixos-organizer-prefpane") || document;
    const textNodes = root.querySelectorAll("[data-i18n]");
    for (const el of textNodes) {
      const key = el.getAttribute("data-i18n");
      if (key) {
        el.textContent = t(key);
      }
    }
    const phNodes = root.querySelectorAll("[data-i18n-placeholder]");
    for (const el of phNodes) {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) {
        el.setAttribute("placeholder", t(key));
      }
    }
  }

  function pathForKey(key) {
    const found = collectionsCache.find((c) => c.key === key);
    return found ? found.path : `(key: ${key})`;
  }

  function populateCollectionSelects(preselectSourceKey) {
    const srcSel = $("eixos-new-source");
    const tgtSel = $("eixos-new-target");
    if (!srcSel || !tgtSel) return;

    const prevSrc = preselectSourceKey || srcSel.value;
    const prevTgt = tgtSel.value;

    srcSel.textContent = "";
    tgtSel.textContent = "";

    const autoOpt = document.createElementNS("http://www.w3.org/1999/xhtml", "option");
    autoOpt.value = "__AUTO__";
    autoOpt.textContent = t("prefTargetAuto");
    tgtSel.appendChild(autoOpt);

    for (const c of collectionsCache) {
      const opt1 = document.createElementNS("http://www.w3.org/1999/xhtml", "option");
      opt1.value = c.key;
      opt1.textContent = c.path;
      srcSel.appendChild(opt1);

      const opt2 = document.createElementNS("http://www.w3.org/1999/xhtml", "option");
      opt2.value = c.key;
      opt2.textContent = c.path;
      tgtSel.appendChild(opt2);
    }

    if (prevSrc && collectionsCache.some((c) => c.key === prevSrc)) {
      srcSel.value = prevSrc;
    }
    if (prevTgt && (prevTgt === "__AUTO__" || collectionsCache.some((c) => c.key === prevTgt))) {
      tgtSel.value = prevTgt;
    } else {
      tgtSel.value = "__AUTO__";
    }
  }

  function renderRules() {
    const container = $("eixos-rules-list");
    if (!container) return;
    container.textContent = "";

    if (rulesState.length === 0) {
      const empty = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      empty.className = "eixos-empty";
      empty.textContent = t("prefRulesEmpty");
      container.appendChild(empty);
      return;
    }

    for (let i = 0; i < rulesState.length; i++) {
      const rule = rulesState[i];
      const row = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      row.className = "eixos-rule-row" + (rule.enabled ? "" : " eixos-rule-disabled");

      const left = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      left.className = "eixos-rule-info";

      const toggle = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
      toggle.type = "checkbox";
      toggle.checked = rule.enabled !== false;
      toggle.title = t("prefRuleToggleTitle");
      toggle.addEventListener("change", () => {
        rulesState[i].enabled = toggle.checked;
        persistRules();
        renderRules();
      });

      const textWrap = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      const line1 = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      line1.className = "eixos-rule-title";
      line1.textContent = `${pathForKey(rule.sourceKey)}  →  ${pathForKey(rule.targetRootKey)}`;

      const line2 = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      line2.className = "eixos-rule-meta";
      line2.textContent = rule.allowCreateNew
        ? t("prefRuleAllowNew")
        : t("prefRuleExistingOnly");

      textWrap.appendChild(line1);
      textWrap.appendChild(line2);
      left.appendChild(toggle);
      left.appendChild(textWrap);

      const actions = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      actions.className = "eixos-btn-row";

      const runBtn = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
      runBtn.type = "button";
      runBtn.className = "eixos-btn";
      runBtn.textContent = t("prefBtnOpenPlan");
      runBtn.addEventListener("click", async () => {
        const col = Zotero.Collections.getByLibraryAndKey(
          rule.libraryID || Zotero.Libraries.userLibraryID,
          rule.sourceKey
        );
        if (col) {
          await api().organizeCollectionWithPlan(col);
        }
      });

      const delBtn = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
      delBtn.type = "button";
      delBtn.className = "eixos-btn eixos-btn-danger";
      delBtn.textContent = t("prefBtnRemoveRule");
      delBtn.title = t("prefBtnRemoveRuleTitle");
      delBtn.addEventListener("click", () => {
        rulesState.splice(i, 1);
        persistRules();
        renderRules();
      });

      actions.appendChild(runBtn);
      actions.appendChild(delBtn);

      row.appendChild(left);
      row.appendChild(actions);
      container.appendChild(row);
    }
  }

  async function persistRules() {
    const clean = api().config.normalizeRules(rulesState);
    rulesState = clean;
    api().config.saveLocalSettings({ rules: clean });
    const s = api().config.getSettings();
    if (s.syncConfigInLibrary) {
      try {
        await api().config.saveRulesToSyncNote(clean);
        setStatus("eixos-rules-status", t("statusSavedSynced"));
        setStatus("eixos-global-status", t("statusSavedSynced"));
      } catch (e) {
        const msg = t("statusSavedLocalErr", { err: e.message || e });
        setStatus("eixos-rules-status", msg, true);
        setStatus("eixos-global-status", msg, true);
      }
    } else {
      setStatus("eixos-rules-status", t("statusSavedLocal"));
      setStatus("eixos-global-status", t("statusSavedLocal"));
    }
  }

  function updateEndpointVisibility() {
    const provider = $("eixos-provider").value;
    const row = $("eixos-endpoint-row");
    if (row) {
      row.style.display = provider === "custom" ? "flex" : "none";
    }
  }

  function updateKeyEncryptionStatus() {
    const el = $("eixos-key-enc-status");
    if (!el || !api()) return;
    const method = api().config.getApiKeyStorageMethod();
    if (method === "nss-sdr") {
      el.textContent = t("prefKeyStatusNss");
    } else if (method === "aes-gcm") {
      el.textContent = t("prefKeyStatusAes");
    } else {
      el.textContent = t("prefKeyStatusEmpty");
    }
  }

  function saveFormFields() {
    const partial = {
      language: $("eixos-language") ? $("eixos-language").value : "auto",
      mode: $("eixos-mode").value,
      maxTargets: Math.max(1, Math.min(8, Number($("eixos-max-targets").value) || 3)),
      allowCreateNew: $("eixos-allow-create").checked,
      skipAlreadyClassified: $("eixos-skip-classified").checked,
      engine: $("eixos-engine").value,
      aiProvider: $("eixos-provider").value,
      aiModel: $("eixos-model").value.trim(),
      aiEndpoint: $("eixos-endpoint").value.trim(),
      syncConfigInLibrary: $("eixos-sync-library").checked,
    };
    api().config.saveLocalSettings(partial);
  }

  async function saveApiKeyField() {
    try {
      const raw = $("eixos-apikey").value.trim();
      const res = await api().config.saveApiKey(raw);
      updateKeyEncryptionStatus();
      if (res.method === "none") {
        setStatus("eixos-ai-status", t("statusKeyCleared"));
      } else {
        const label = res.method === "nss-sdr" ? "NSS key4.db" : "AES-256-GCM";
        setStatus("eixos-ai-status", t("statusKeySavedEnc", { method: label }));
      }
      return true;
    } catch (err) {
      setStatus("eixos-ai-status", t("statusKeyEncryptErr", { err: err.message || err }), true);
      return false;
    }
  }

  async function loadFormFields() {
    const s = await api().config.getSettingsAsync();
    rulesState = s.rules.slice();
    if ($("eixos-language")) {
      $("eixos-language").value = s.language || "auto";
    }
    $("eixos-mode").value = s.mode;
    $("eixos-max-targets").value = String(s.maxTargets);
    $("eixos-allow-create").checked = s.allowCreateNew;
    $("eixos-skip-classified").checked = s.skipAlreadyClassified;
    $("eixos-engine").value = s.engine;
    $("eixos-provider").value = s.aiProvider;
    $("eixos-apikey").value = s.aiApiKey;
    $("eixos-model").value = s.aiModel || api().config.getDefaultModelForProvider(s.aiProvider);
    $("eixos-endpoint").value = s.aiEndpoint;
    $("eixos-sync-library").checked = s.syncConfigInLibrary;
    updateEndpointVisibility();
    updateKeyEncryptionStatus();
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    const langEl = $("eixos-language");
    if (langEl) {
      langEl.addEventListener("change", () => {
        saveFormFields();
        applyLanguage();
        populateCollectionSelects();
        renderRules();
        updateKeyEncryptionStatus();
        setStatus("eixos-global-status", t("statusSaved"));
      });
    }

    const autoSaveIds = [
      "eixos-mode",
      "eixos-max-targets",
      "eixos-allow-create",
      "eixos-skip-classified",
      "eixos-engine",
      "eixos-model",
      "eixos-endpoint",
      "eixos-sync-library",
    ];
    for (const id of autoSaveIds) {
      const el = $(id);
      if (el) {
        el.addEventListener("change", () => {
          saveFormFields();
          setStatus("eixos-global-status", t("statusSaved"));
        });
      }
    }

    $("eixos-apikey").addEventListener("change", async () => {
      await saveApiKeyField();
    });

    const clearKeyBtn = $("eixos-btn-clear-key");
    if (clearKeyBtn) {
      clearKeyBtn.addEventListener("click", async () => {
        $("eixos-apikey").value = "";
        await api().config.clearApiKey();
        updateKeyEncryptionStatus();
        setStatus("eixos-ai-status", t("statusKeyCleared"));
      });
    }

    $("eixos-provider").addEventListener("change", () => {
      const provider = $("eixos-provider").value;
      $("eixos-model").value = api().config.getDefaultModelForProvider(provider);
      updateEndpointVisibility();
      saveFormFields();
    });

    $("eixos-btn-refresh-cols").addEventListener("click", async () => {
      collectionsCache = await api().organizer.listAllCollections();
      populateCollectionSelects();
      renderRules();
      setStatus("eixos-rules-status", t("statusColsUpdated", { count: collectionsCache.length }));
    });

    $("eixos-btn-autodiscover").addEventListener("click", async () => {
      const discovered = await api().config.autoDiscoverRules();
      if (discovered.length === 0) {
        setStatus("eixos-rules-status", t("statusNoPairsFound"), true);
        return;
      }
      rulesState = api().config.normalizeRules(rulesState.concat(discovered));
      await persistRules();
      renderRules();
      setStatus("eixos-rules-status", t("statusPairsFound", { count: discovered.length }));
    });

    $("eixos-btn-add-rule").addEventListener("click", async () => {
      const sourceKey = $("eixos-new-source").value;
      let targetRootKey = $("eixos-new-target").value;
      if (!sourceKey) {
        setStatus("eixos-rules-status", t("statusSelectSource"), true);
        return;
      }

      const libID = Zotero.Libraries.userLibraryID;
      if (!targetRootKey || targetRootKey === "__AUTO__") {
        try {
          const detected = await api().organizer.findExistingTargetForSource(libID, sourceKey);
          if (detected) {
            targetRootKey = detected.key;
          } else {
            const created = await api().organizer.ensureTargetRootInsideSource(
              libID,
              sourceKey
            );
            targetRootKey = created.key;
            collectionsCache = await api().organizer.listAllCollections(libID);
            populateCollectionSelects(sourceKey);
          }
        } catch (err) {
          setStatus(
            "eixos-rules-status",
            t("statusTargetPrepErr", { err: err.message || err }),
            true
          );
          return;
        }
      }

      if (sourceKey === targetRootKey) {
        setStatus("eixos-rules-status", t("statusSameFolder"), true);
        return;
      }
      const already = rulesState.some(
        (r) => r.sourceKey === sourceKey && r.targetRootKey === targetRootKey
      );
      if (already) {
        setStatus("eixos-rules-status", t("statusDuplicateRule"), true);
        return;
      }
      rulesState.push({
        id: `rule_${sourceKey}_${targetRootKey}`,
        enabled: true,
        libraryID: libID,
        sourceKey,
        targetRootKey,
        allowCreateNew: $("eixos-new-allow-create").checked,
        label: `${pathForKey(sourceKey)} → ${pathForKey(targetRootKey)}`,
      });
      await persistRules();
      renderRules();
    });

    $("eixos-btn-test-ai").addEventListener("click", async () => {
      saveFormFields();
      const ok = await saveApiKeyField();
      if (!ok) return;
      const s = await api().config.getSettingsAsync();
      setStatus("eixos-ai-status", t("statusTestingAI"));
      try {
        await api().classifier.testAIConnection(s);
        setStatus(
          "eixos-ai-status",
          t("statusAIOk", { provider: s.aiProvider, model: s.aiModel })
        );
      } catch (err) {
        setStatus("eixos-ai-status", t("statusAIFail", { err: err.message || err }), true);
      }
    });

    $("eixos-btn-sync-push").addEventListener("click", async () => {
      saveFormFields();
      await persistRules();
    });

    $("eixos-btn-sync-pull").addEventListener("click", async () => {
      try {
        const payload = await api().config.loadRulesFromSyncNote();
        if (payload && payload.rules) {
          rulesState = payload.rules;
          renderRules();
          setStatus(
            "eixos-global-status",
            t("statusLoadedFromLib", { count: rulesState.length })
          );
        } else {
          setStatus("eixos-global-status", t("statusNoSyncNote"), true);
        }
      } catch (err) {
        setStatus(
          "eixos-global-status",
          t("statusLoadErr", { err: err.message || err }),
          true
        );
      }
    });

    $("eixos-btn-export").addEventListener("click", async () => {
      try {
        const { FilePicker } = ChromeUtils.importESModule(
          "chrome://zotero/content/modules/filePicker.mjs"
        );
        const fp = new FilePicker();
        fp.init(window, t("filePickerExportTitle"), fp.modeSave);
        fp.defaultString = "organizer-config.json";
        fp.appendFilter("JSON", "*.json");
        const rv = await fp.show();
        if (rv === fp.returnOK || rv === fp.returnReplace) {
          await Zotero.File.putContentsAsync(fp.file, api().config.exportConfigJSON());
          setStatus("eixos-global-status", t("statusExportOk"));
        }
      } catch (err) {
        setStatus(
          "eixos-global-status",
          t("statusExportErr", { err: err.message || err }),
          true
        );
      }
    });

    $("eixos-btn-import").addEventListener("click", async () => {
      try {
        const { FilePicker } = ChromeUtils.importESModule(
          "chrome://zotero/content/modules/filePicker.mjs"
        );
        const fp = new FilePicker();
        fp.init(window, t("filePickerImportTitle"), fp.modeOpen);
        fp.appendFilter("JSON", "*.json");
        const rv = await fp.show();
        if (rv === fp.returnOK) {
          const text = await Zotero.File.getContentsAsync(fp.file);
          await api().config.importConfigJSON(text);
          await loadFormFields();
          applyLanguage();
          populateCollectionSelects();
          renderRules();
          updateKeyEncryptionStatus();
          setStatus(
            "eixos-global-status",
            t("statusImportOk", { count: rulesState.length })
          );
        }
      } catch (err) {
        setStatus(
          "eixos-global-status",
          t("statusImportErr", { err: err.message || err }),
          true
        );
      }
    });
  }

  async function init() {
    if (!api()) {
      setStatus("eixos-rules-status", "Organizer API unavailable. Please re-enable the plugin.", true);
      return;
    }
    try {
      bindEvents();
      collectionsCache = await api().organizer.listAllCollections();
      await loadFormFields();
      applyLanguage();
      updateKeyEncryptionStatus();
      const pendingSource = api().consumePendingSourceKey();
      populateCollectionSelects(pendingSource);
      renderRules();
    } catch (err) {
      Zotero.debug("EixosPrefsPane.init error: " + err);
      setStatus(
        "eixos-rules-status",
        t("statusInitErr", { err: err.message || err }),
        true
      );
    }
  }

  const exported = { init };
  try {
    window.EixosPrefsPane = exported;
  } catch (e) {}
  try {
    if (Zotero.EixosOrganizer) {
      Zotero.EixosOrganizer._prefsPane = exported;
    }
  } catch (e) {}
  return exported;
})();

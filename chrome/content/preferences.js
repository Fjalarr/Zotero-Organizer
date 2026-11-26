/* global Zotero, document, window */

var EixosPrefsPane = (function () {
  let collectionsCache = [];
  let rulesState = [];

  function api() {
    return Zotero.EixosOrganizer;
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
    if (prevTgt && collectionsCache.some((c) => c.key === prevTgt)) {
      tgtSel.value = prevTgt;
    }
  }

  function renderRules() {
    const container = $("eixos-rules-list");
    if (!container) return;
    container.textContent = "";

    if (rulesState.length === 0) {
      const empty = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      empty.className = "eixos-empty";
      empty.textContent =
        "Nenhuma pasta gerenciada ainda. Clique em 'Detectar Automaticamente' ou adicione uma regra abaixo.";
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
      toggle.title = "Ativar/desativar monitoramento desta pasta";
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
        ? "Permite criar novos temas quando necessário"
        : "Usa apenas temas já existentes";

      textWrap.appendChild(line1);
      textWrap.appendChild(line2);
      left.appendChild(toggle);
      left.appendChild(textWrap);

      const actions = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      actions.className = "eixos-btn-row";

      const runBtn = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
      runBtn.type = "button";
      runBtn.className = "eixos-btn";
      runBtn.textContent = "Classificar Pendentes";
      runBtn.addEventListener("click", async () => {
        const col = Zotero.Collections.getByLibraryAndKey(
          rule.libraryID || Zotero.Libraries.userLibraryID,
          rule.sourceKey
        );
        if (col) {
          await api().classifyCollectionPending(col);
        }
      });

      const delBtn = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
      delBtn.type = "button";
      delBtn.className = "eixos-btn eixos-btn-danger";
      delBtn.textContent = "Remover Regra";
      delBtn.title = "Remove apenas a regra do plugin (não apaga nenhuma pasta nem livro no Zotero)";
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
        setStatus("eixos-global-status", "Regras salvas e sincronizadas na biblioteca.");
      } catch (e) {
        setStatus("eixos-global-status", "Salvo localmente (erro ao sincronizar nota: " + e.message + ")", true);
      }
    } else {
      setStatus("eixos-global-status", "Regras salvas localmente.");
    }
  }

  function updateEndpointVisibility() {
    const provider = $("eixos-provider").value;
    const row = $("eixos-endpoint-row");
    if (row) {
      row.style.display = provider === "custom" ? "flex" : "none";
    }
  }

  function saveFormFields() {
    const partial = {
      mode: $("eixos-mode").value,
      maxTargets: Math.max(1, Math.min(8, Number($("eixos-max-targets").value) || 3)),
      allowCreateNew: $("eixos-allow-create").checked,
      skipAlreadyClassified: $("eixos-skip-classified").checked,
      engine: $("eixos-engine").value,
      aiProvider: $("eixos-provider").value,
      aiApiKey: $("eixos-apikey").value.trim(),
      aiModel: $("eixos-model").value.trim(),
      aiEndpoint: $("eixos-endpoint").value.trim(),
      syncConfigInLibrary: $("eixos-sync-library").checked,
    };
    api().config.saveLocalSettings(partial);
  }

  function loadFormFields() {
    const s = api().config.getSettings();
    rulesState = s.rules.slice();
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
  }

  function bindEvents() {
    const autoSaveIds = [
      "eixos-mode",
      "eixos-max-targets",
      "eixos-allow-create",
      "eixos-skip-classified",
      "eixos-engine",
      "eixos-apikey",
      "eixos-model",
      "eixos-endpoint",
      "eixos-sync-library",
    ];
    for (const id of autoSaveIds) {
      const el = $(id);
      if (el) {
        el.addEventListener("change", () => {
          saveFormFields();
          setStatus("eixos-global-status", "Configurações salvas.");
        });
      }
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
      setStatus("eixos-global-status", `Lista atualizada (${collectionsCache.length} coleções).`);
    });

    $("eixos-btn-autodiscover").addEventListener("click", async () => {
      const discovered = await api().config.autoDiscoverRules();
      if (discovered.length === 0) {
        setStatus("eixos-global-status", "Nenhum par '<Pasta> → <Pasta> - Por Eixo e Tema' encontrado.", true);
        return;
      }
      rulesState = api().config.normalizeRules(rulesState.concat(discovered));
      await persistRules();
      renderRules();
      setStatus("eixos-global-status", `${discovered.length} par(es) detectado(s) automaticamente!`);
    });

    $("eixos-btn-add-rule").addEventListener("click", async () => {
      const sourceKey = $("eixos-new-source").value;
      const targetRootKey = $("eixos-new-target").value;
      if (!sourceKey || !targetRootKey) return;
      if (sourceKey === targetRootKey) {
        setStatus("eixos-global-status", "A pasta de origem e a pasta destino devem ser diferentes.", true);
        return;
      }
      rulesState.push({
        id: `rule_${sourceKey}_${targetRootKey}`,
        enabled: true,
        libraryID: Zotero.Libraries.userLibraryID,
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
      const s = api().config.getSettings();
      setStatus("eixos-ai-status", "Testando conexão…");
      try {
        await api().classifier.testAIConnection(s);
        setStatus("eixos-ai-status", `Conexão OK (${s.aiProvider} / ${s.aiModel})!`);
      } catch (err) {
        setStatus("eixos-ai-status", "Falha: " + (err.message || err), true);
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
          setStatus("eixos-global-status", `Carregado da biblioteca (${rulesState.length} regra(s)).`);
        } else {
          setStatus("eixos-global-status", "Nenhuma nota de configuração sincronizada encontrada na biblioteca.", true);
        }
      } catch (err) {
        setStatus("eixos-global-status", "Erro ao carregar: " + (err.message || err), true);
      }
    });

    $("eixos-btn-export").addEventListener("click", async () => {
      try {
        const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
        const fp = new FilePicker();
        fp.init(window, "Exportar configuração Eixos Organizer", fp.modeSave);
        fp.defaultString = "eixos-organizer-config.json";
        fp.appendFilter("JSON", "*.json");
        const rv = await fp.show();
        if (rv === fp.returnOK || rv === fp.returnReplace) {
          await Zotero.File.putContentsAsync(fp.file, api().config.exportConfigJSON());
          setStatus("eixos-global-status", "Configuração exportada com sucesso (sem chaves de API).");
        }
      } catch (err) {
        setStatus("eixos-global-status", "Erro ao exportar: " + (err.message || err), true);
      }
    });

    $("eixos-btn-import").addEventListener("click", async () => {
      try {
        const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
        const fp = new FilePicker();
        fp.init(window, "Importar configuração Eixos Organizer", fp.modeOpen);
        fp.appendFilter("JSON", "*.json");
        const rv = await fp.show();
        if (rv === fp.returnOK) {
          const text = await Zotero.File.getContentsAsync(fp.file);
          await api().config.importConfigJSON(text);
          loadFormFields();
          renderRules();
          setStatus("eixos-global-status", `Configuração importada (${rulesState.length} regra(s))!`);
        }
      } catch (err) {
        setStatus("eixos-global-status", "Erro ao importar: " + (err.message || err), true);
      }
    });
  }

  async function init() {
    if (!api()) return;
    collectionsCache = await api().organizer.listAllCollections();
    loadFormFields();
    const pendingSource = api().consumePendingSourceKey();
    populateCollectionSelects(pendingSource);
    renderRules();
    bindEvents();
  }

  return { init };
})();

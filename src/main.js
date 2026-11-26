/* global Zotero, ChromeUtils, EixosConfig, EixosOrganizer, EixosClassifier */

var EixosMain = (function () {
  let _setTimeout = typeof setTimeout === "function" ? setTimeout : null;
  let _clearTimeout = typeof clearTimeout === "function" ? clearTimeout : null;
  try {
    const timerMod = ChromeUtils.importESModule("resource://gre/modules/Timer.sys.mjs");
    if (timerMod && timerMod.setTimeout) {
      _setTimeout = timerMod.setTimeout;
      _clearTimeout = timerMod.clearTimeout;
    }
  } catch (e) {}

  let pluginID = "eixos-organizer@danielbarreto.local";
  let rootURI = "";
  let notifierID = null;
  let prefPaneID = null;
  let registeredMenus = [];
  let queue = [];
  let isProcessingQueue = false;
  let pendingTimer = null;
  const recentHandled = new Map(); // `${sourceKey}:${itemID}` -> timestamp
  let pendingSourceKeyForPrefs = null;

  function showToast(headline, lines, closeMs) {
    try {
      const pw = new Zotero.ProgressWindow({ closeOnClick: true });
      pw.changeHeadline(headline || "Eixos Organizer");
      if (Array.isArray(lines)) {
        for (const ln of lines) {
          pw.addDescription(String(ln));
        }
      } else if (lines) {
        pw.addDescription(String(lines));
      }
      pw.show();
      pw.startCloseTimer(closeMs || 4500);
      return pw;
    } catch (e) {
      Zotero.debug("EixosMain.showToast error: " + e);
      return null;
    }
  }

  function injectFTL(win) {
    try {
      if (win && win.MozXULElement && typeof win.MozXULElement.insertFTLIfNeeded === "function") {
        win.MozXULElement.insertFTLIfNeeded("eixos-organizer.ftl");
      }
    } catch (e) {
      Zotero.debug("EixosMain: FTL inject failed: " + e);
    }
  }

  function getActiveWindow() {
    try {
      return Zotero.getMainWindow();
    } catch (e) {
      return null;
    }
  }

  function openPreferences(preselectSourceKey) {
    if (preselectSourceKey) {
      pendingSourceKeyForPrefs = preselectSourceKey;
    }
    try {
      if (prefPaneID && Zotero.Utilities && Zotero.Utilities.Internal && Zotero.Utilities.Internal.openPreferences) {
        Zotero.Utilities.Internal.openPreferences(prefPaneID);
        return;
      }
    } catch (e) {
      Zotero.debug("EixosMain.openPreferences error: " + e);
    }
    const win = getActiveWindow();
    if (win && win.ZoteroPane && typeof win.ZoteroPane.openPreferences === "function") {
      win.ZoteroPane.openPreferences(prefPaneID);
    }
  }

  function consumePendingSourceKey() {
    const k = pendingSourceKeyForPrefs;
    pendingSourceKeyForPrefs = null;
    return k;
  }

  function openInteractiveDialog(item, rule, targetTree, initialClassification, settings, batchInfo) {
    const win = getActiveWindow();
    if (!win) return null;

    const itemMeta = EixosOrganizer.getItemMetadata(item);
    const sourceCol = Zotero.Collections.getByLibraryAndKey(rule.libraryID || item.libraryID, rule.sourceKey);
    const dialogArgs = {
      itemMeta,
      sourceName: sourceCol ? sourceCol.name : rule.sourceKey,
      targetTree,
      classification: initialClassification,
      settings,
      batchIndex: batchInfo ? batchInfo.index : 1,
      batchTotal: batchInfo ? batchInfo.total : 1,
      allowCreateNew: Boolean(settings.allowCreateNew && rule.allowCreateNew !== false),
      reclassify: async (forceEngine) => {
        const latestSettings = EixosConfig.getSettings();
        return EixosClassifier.classifyItem(itemMeta, targetTree, latestSettings, forceEngine);
      },
      result: null,
    };

    win.openDialog(
      "chrome://eixos-organizer/content/classify-dialog.xhtml",
      "eixos-organizer-classify-dialog",
      "chrome,dialog,modal,centerscreen,resizable,width=700,height=680",
      dialogArgs
    );

    return dialogArgs.result;
  }

  async function processSingleItem(item, rule, options) {
    const opts = options || {};
    const settings = EixosConfig.getSettings();
    const libID = rule.libraryID || item.libraryID || Zotero.Libraries.userLibraryID;

    if (!item || item.deleted) return { status: "skipped" };
    if (item.isNote && item.isNote()) return { status: "skipped" };
    if (item.isAttachment && item.isAttachment() && item.parentItemID) return { status: "skipped" };

    const targetTree = await EixosOrganizer.getTargetTree(libID, rule.targetRootKey);
    if (!opts.force && settings.skipAlreadyClassified && EixosOrganizer.isItemAlreadyInTargetTree(item, targetTree)) {
      return { status: "already_classified" };
    }

    const itemMeta = EixosOrganizer.getItemMetadata(item);
    if (!itemMeta || !itemMeta.title) {
      return { status: "skipped" };
    }

    const effectiveSettings = Object.assign({}, settings, {
      allowCreateNew: Boolean(settings.allowCreateNew && rule.allowCreateNew !== false),
    });

    const classification = await EixosClassifier.classifyItem(itemMeta, targetTree, effectiveSettings);
    const useInteractive = opts.forceInteractive || (!opts.forceAuto && settings.mode !== "auto");

    let selectedKeys = classification.selectedKeys || [];
    let newSubcollections = classification.proposedNew || [];

    if (useInteractive) {
      const dialogResult = openInteractiveDialog(
        item,
        rule,
        targetTree,
        classification,
        effectiveSettings,
        opts.batchInfo
      );
      // Closing via window X or Escape leaves dialogResult === null (or action === "abort"):
      // stop the current batch/queue immediately instead of reopening for the next item.
      if (!dialogResult || dialogResult.action === "abort") {
        return { status: "aborted" };
      }
      if (!dialogResult.confirmed) {
        return { status: "skipped_one" };
      }
      selectedKeys = dialogResult.selectedKeys || [];
      newSubcollections = dialogResult.newSubcollections || [];
    }

    const applied = await EixosOrganizer.applyClassification(
      item,
      libID,
      rule.targetRootKey,
      selectedKeys,
      newSubcollections
    );

    if (applied.changed) {
      const createdMsg =
        applied.createdNames.length > 0
          ? ` (nova pasta: ${applied.createdNames.join(", ")})`
          : "";
      if (!opts.silentToast) {
        showToast(
          "Eixos Organizer — Item organizado",
          [
            `“${itemMeta.title.slice(0, 72)}”`,
            `Anexado em ${targetTree.root.name} → ${applied.linkedNames.join(" • ")}${createdMsg}`,
          ],
          5500
        );
      }
      return { status: "linked", applied };
    }
    return { status: "unchanged" };
  }

  function openPlanDialog(dialogArgs) {
    const win = getActiveWindow();
    if (!win) return null;

    win.openDialog(
      "chrome://eixos-organizer/content/plan-dialog.xhtml",
      "eixos-organizer-plan-dialog",
      "chrome,dialog,modal,centerscreen,resizable,width=780,height=700",
      dialogArgs
    );

    return dialogArgs.result;
  }

  async function ensureRuleRegistered(libID, sourceCol, targetCol) {
    const settings = EixosConfig.getSettings();
    const existing = settings.rules.find(
      (r) =>
        (r.libraryID || libID) === libID &&
        r.sourceKey === sourceCol.key &&
        r.targetRootKey === targetCol.key
    );
    if (existing) return existing;

    const newRule = {
      id: `rule_${sourceCol.key}_${targetCol.key}`,
      enabled: true,
      libraryID: libID,
      sourceKey: sourceCol.key,
      targetRootKey: targetCol.key,
      allowCreateNew: true,
      label: `${sourceCol.name} → ${targetCol.name}`,
    };
    const merged = EixosConfig.normalizeRules(settings.rules.concat([newRule]));
    EixosConfig.saveLocalSettings({ rules: merged });
    if (settings.syncConfigInLibrary) {
      try {
        await EixosConfig.saveRulesToSyncNote(merged, libID);
      } catch (e) {
        Zotero.debug("EixosMain.ensureRuleRegistered sync note error: " + e);
      }
    }
    return newRule;
  }

  /**
   * Single-screen batch workflow:
   * 1. Auto-detects existing thematic subcollection (nested or sibling) or prepares to create one inside source.
   * 2. Scans all pending items in memory (skipping items already placed in the thematic tree).
   * 3. Opens ONE Plan Review dialog showing all suggested axes & items.
   * 4. Only on "Executar Organização" creates subcollections, links items, and registers automatic monitoring.
   */
  async function organizeCollectionWithPlan(collection) {
    const win = getActiveWindow();
    const pane = win && win.ZoteroPane;
    const col = collection || (pane && pane.getSelectedCollection());
    if (!col) {
      showToast("Eixos Organizer", ["Selecione primeiro uma coleção no painel esquerdo."], 4000);
      return;
    }

    const libID = col.libraryID || Zotero.Libraries.userLibraryID;
    const settings = EixosConfig.getSettings();

    // Prevent accidentally running organization on a destination thematic root itself
    const isTargetRoot = settings.rules.some(
      (r) => (r.libraryID || libID) === libID && r.targetRootKey === col.key
    );
    if (isTargetRoot) {
      showToast(
        "Eixos Organizer",
        [
          `“${col.name}” já é uma subcoleção temática de destino.`,
          "Execute 'Organizar por Eixo e Tema' na pasta principal (ex.: Livros ou Minha biblioteca).",
        ],
        5500
      );
      return;
    }

    // 1. Check configured rule or auto-detect existing thematic subcollection
    let rule = EixosConfig.findRuleForSourceCollection(col.key, libID);
    let existingTarget = null;
    let targetTree = null;

    if (rule) {
      const tCol = Zotero.Collections.getByLibraryAndKey(libID, rule.targetRootKey);
      if (tCol) {
        existingTarget = { id: tCol.id, key: tCol.key, name: tCol.name, path: tCol.name };
        targetTree = await EixosOrganizer.getTargetTree(libID, tCol.key);
      }
    }

    if (!targetTree) {
      const detected = await EixosOrganizer.findExistingTargetForSource(libID, col.key);
      if (detected) {
        existingTarget = {
          id: detected.id,
          key: detected.key,
          name: detected.name,
          path:
            detected.location === "nested"
              ? `${col.name} / ${detected.name}`
              : detected.name,
        };
        targetTree = await EixosOrganizer.getTargetTree(libID, detected.key);
      }
    }

    // 2. Collect pending items (items already inside targetTree are untouched!)
    const { pending } = await EixosOrganizer.getPendingItemsForPlanning(
      libID,
      col.key,
      targetTree,
      settings.skipAlreadyClassified
    );

    if (pending.length === 0) {
      showToast(
        "Eixos Organizer",
        [
          existingTarget
            ? `Todos os itens de “${col.name}” já estão organizados em “${existingTarget.name}”!`
            : `A coleção “${col.name}” não possui livros/artigos diretos para organizar.`,
        ],
        4500
      );
      return;
    }

    const itemsMeta = pending
      .map((it) => EixosOrganizer.getItemMetadata(it))
      .filter((m) => m && m.title);

    if (itemsMeta.length === 0) {
      showToast("Eixos Organizer", [`Nenhum item com título válido encontrado em “${col.name}”.`], 4500);
      return;
    }

    const effectiveSettings = Object.assign({}, settings, {
      allowCreateNew: Boolean(
        settings.allowCreateNew && (!rule || rule.allowCreateNew !== false)
      ),
    });

    // 3. Build complete plan in memory (ZERO writes to Zotero yet)
    let plan;
    try {
      plan = await EixosClassifier.buildBatchPlan(itemsMeta, targetTree, effectiveSettings);
    } catch (err) {
      showToast("Eixos Organizer — Erro ao gerar plano", [String(err.message || err)], 6500);
      return;
    }

    // 4. Open ONE review dialog for the entire collection
    const dialogResult = openPlanDialog({
      sourceName: col.name,
      totalPending: itemsMeta.length,
      existingTarget,
      defaultNewRootName: "Por Eixo e Tema",
      plan,
      replan: async (forceEngine) => {
        const latest = EixosConfig.getSettings();
        return EixosClassifier.buildBatchPlan(itemsMeta, targetTree, latest, forceEngine);
      },
      result: null,
    });

    if (!dialogResult || !dialogResult.confirmed || !Array.isArray(dialogResult.groups) || dialogResult.groups.length === 0) {
      return;
    }

    // 5. Execute approved plan (100% non-destructive)
    try {
      let targetRootCol;
      if (existingTarget) {
        targetRootCol = Zotero.Collections.getByLibraryAndKey(libID, existingTarget.key);
      }
      if (!targetRootCol) {
        targetRootCol = await EixosOrganizer.ensureTargetRootInsideSource(
          libID,
          col.key,
          dialogResult.newRootName || "Por Eixo e Tema"
        );
      }

      // Register managed rule automatically so future items dropped in `col` are organized in real time
      await ensureRuleRegistered(libID, col, targetRootCol);

      // Create/resolve all approved axis subcollections first
      const itemToColIDs = new Map();
      const createdAxisNames = [];

      for (const grp of dialogResult.groups) {
        let axisCol = null;
        if (!grp.isNew && grp.existingKey) {
          axisCol = Zotero.Collections.getByLibraryAndKey(libID, grp.existingKey);
        }
        if (!axisCol) {
          let parentID = targetRootCol.id;
          if (grp.parentKey && grp.parentKey !== "__ROOT__" && grp.parentKey !== targetRootCol.key) {
            const pCol = Zotero.Collections.getByLibraryAndKey(libID, grp.parentKey);
            if (pCol) parentID = pCol.id;
          }
          axisCol = await EixosOrganizer.getOrCreateSubcollection(libID, parentID, grp.name);
          createdAxisNames.push(axisCol.name);
        }

        for (const itemID of grp.itemIds || []) {
          if (!itemToColIDs.has(itemID)) itemToColIDs.set(itemID, new Set());
          itemToColIDs.get(itemID).add(axisCol.id);
        }
      }

      // Link each item in a single saveTx() call (never removes from source!)
      let linkedItems = 0;
      let totalLinks = 0;
      for (const [itemID, colIDs] of itemToColIDs.entries()) {
        const item = await Zotero.Items.getAsync(itemID);
        if (!item || item.deleted) continue;
        const currentCols = new Set(item.getCollections());
        let changed = false;
        for (const cid of colIDs) {
          if (!currentCols.has(cid)) {
            item.addToCollection(cid);
            changed = true;
            totalLinks++;
          }
        }
        if (changed) {
          recentHandled.set(`${col.key}:${item.id}`, Date.now());
          await item.saveTx();
          linkedItems++;
        }
      }

      const createdSummary =
        createdAxisNames.length > 0 ? ` | ${createdAxisNames.length} pasta(s) criada(s)` : "";
      showToast(
        "Eixos Organizer — Organização concluída",
        [
          `“${col.name}” → “${targetRootCol.name}”`,
          `${linkedItems} item(ns) vinculado(s) (${totalLinks} vínculos)${createdSummary}. Monitoramento automático ativado!`,
        ],
        7000
      );
    } catch (err) {
      Zotero.debug("EixosMain.organizeCollectionWithPlan execute error: " + err);
      showToast("Eixos Organizer — Erro ao executar plano", [String(err.message || err)], 7000);
    }
  }

  function enqueueAddedItem(collectionID, itemID) {
    const col = Zotero.Collections.get(collectionID);
    if (!col) return;
    const rule = EixosConfig.findRuleForSourceCollection(col.key, col.libraryID);
    if (!rule) return;

    const dedupKey = `${rule.sourceKey}:${itemID}`;
    const now = Date.now();
    const last = recentHandled.get(dedupKey);
    if (last && now - last < 8000) return;
    recentHandled.set(dedupKey, now);

    // Avoid duplicate entries in queue
    if (queue.some((q) => q.itemID === itemID && q.rule.sourceKey === rule.sourceKey)) {
      return;
    }

    queue.push({ itemID, rule });

    if (pendingTimer && _clearTimeout) {
      _clearTimeout(pendingTimer);
    }
    // Wait briefly so Zotero finishes attaching PDFs/metadata before classifying
    if (_setTimeout) {
      pendingTimer = _setTimeout(() => {
        pendingTimer = null;
        drainQueue();
      }, 1200);
    } else {
      drainQueue();
    }
  }

  async function drainQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    try {
      let processed = 0;
      const initialTotal = queue.length;
      while (queue.length > 0) {
        const task = queue.shift();
        processed++;
        try {
          const item = await Zotero.Items.getAsync(task.itemID);
          if (!item || item.deleted) continue;
          const res = await processSingleItem(item, task.rule, {
            force: false,
            batchInfo: { index: processed, total: Math.max(initialTotal, processed + queue.length) },
          });
          if (res && res.status === "aborted") {
            queue = [];
            break;
          }
        } catch (err) {
          Zotero.debug("EixosMain.drainQueue item error: " + err);
          showToast("Eixos Organizer — Aviso", [String(err.message || err)], 6000);
        }
      }
    } finally {
      isProcessingQueue = false;
    }
  }

  const notifierObserver = {
    notify(event, type, ids, extraData) {
      if (type !== "collection-item" || event !== "add") return;
      if (!Array.isArray(ids)) return;
      for (const pair of ids) {
        const parts = String(pair).split("-");
        if (parts.length !== 2) continue;
        const collectionID = Number(parts[0]);
        const itemID = Number(parts[1]);
        if (!Number.isFinite(collectionID) || !Number.isFinite(itemID)) continue;
        enqueueAddedItem(collectionID, itemID);
      }
    },
  };

  async function classifySelectedItems() {
    const win = getActiveWindow();
    const pane = win && win.ZoteroPane;
    if (!pane) return;

    const items = pane.getSelectedItems().filter((it) => {
      if (!it || it.deleted) return false;
      if (it.isNote && it.isNote()) return false;
      if (it.isAttachment && it.isAttachment() && it.parentItemID) return false;
      return true;
    });
    if (items.length === 0) {
      showToast("Eixos Organizer", ["Selecione ao menos um livro, artigo ou PDF."], 3500);
      return;
    }

    const settings = EixosConfig.getSettings();
    const enabledRules = settings.rules.filter((r) => r.enabled);
    if (enabledRules.length === 0) {
      showToast(
        "Eixos Organizer",
        ["Nenhuma pasta gerenciada configurada ainda. Abrindo configurações…"],
        4000
      );
      openPreferences();
      return;
    }

    const selectedCol = pane.getSelectedCollection();
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      let rule = null;
      if (selectedCol) {
        rule = EixosConfig.findRuleForSourceCollection(selectedCol.key, selectedCol.libraryID);
      }
      if (!rule) {
        const itemCols = item.getCollections ? item.getCollections() : [];
        for (const cid of itemCols) {
          const c = Zotero.Collections.get(cid);
          if (c) {
            const match = EixosConfig.findRuleForSourceCollection(c.key, c.libraryID);
            if (match) {
              rule = match;
              break;
            }
          }
        }
      }
      if (!rule) {
        rule = enabledRules[0];
      }

      try {
        const res = await processSingleItem(item, rule, {
          force: true,
          forceInteractive: true,
          batchInfo: { index: idx + 1, total: items.length },
        });
        if (res && res.status === "aborted") {
          break;
        }
      } catch (err) {
        showToast("Eixos Organizer — Erro", [String(err.message || err)], 6000);
      }
    }
  }

  async function classifyCollectionPending(collection) {
    return organizeCollectionWithPlan(collection);
  }

  async function reloadSyncedConfigInteractive() {
    try {
      const payload = await EixosConfig.loadRulesFromSyncNote();
      if (payload && payload.rules) {
        showToast(
          "Eixos Organizer",
          [`Configuração sincronizada carregada (${payload.rules.length} regra(s) de pasta).`],
          4500
        );
      } else {
        const discovered = await EixosConfig.autoDiscoverRules();
        showToast(
          "Eixos Organizer",
          [
            discovered.length > 0
              ? `Nenhuma nota sincronizada encontrada; ${discovered.length} par(es) detectado(s) localmente.`
              : "Nenhuma configuração sincronizada encontrada ainda na biblioteca.",
          ],
          5000
        );
      }
    } catch (err) {
      showToast("Eixos Organizer — Erro", [String(err.message || err)], 6000);
    }
  }

  function registerMenus() {
    if (!Zotero.MenuManager || typeof Zotero.MenuManager.registerMenu !== "function") {
      Zotero.debug("EixosMain: Zotero.MenuManager unavailable.");
      return;
    }

    const iconURI = rootURI + "chrome/content/icon.svg";

    const toolsMenuID = Zotero.MenuManager.registerMenu({
      menuID: `${pluginID}:tools-menu`,
      pluginID,
      target: "main/menubar/tools",
      menus: [
        {
          menuType: "submenu",
          l10nID: "eixos-organizer-tools-menu",
          icon: iconURI,
          menus: [
            {
              menuType: "menuitem",
              l10nID: "eixos-organizer-tools-settings",
              onCommand: () => openPreferences(),
            },
            {
              menuType: "menuitem",
              l10nID: "eixos-organizer-tools-classify-collection",
              onCommand: () => classifyCollectionPending(),
            },
            {
              menuType: "separator",
            },
            {
              menuType: "menuitem",
              l10nID: "eixos-organizer-tools-sync-config",
              onCommand: () => reloadSyncedConfigInteractive(),
            },
          ],
        },
      ],
    });
    if (toolsMenuID) registeredMenus.push(toolsMenuID);

    const itemMenuID = Zotero.MenuManager.registerMenu({
      menuID: `${pluginID}:item-menu`,
      pluginID,
      target: "main/library/item",
      menus: [
        {
          menuType: "menuitem",
          l10nID: "eixos-organizer-item-classify",
          icon: iconURI,
          onCommand: () => classifySelectedItems(),
        },
      ],
    });
    if (itemMenuID) registeredMenus.push(itemMenuID);

    const colMenuID = Zotero.MenuManager.registerMenu({
      menuID: `${pluginID}:collection-menu`,
      pluginID,
      target: "main/library/collection",
      menus: [
        {
          menuType: "menuitem",
          l10nID: "eixos-organizer-collection-manage",
          icon: iconURI,
          onCommand: () => {
            const win = getActiveWindow();
            const col = win && win.ZoteroPane && win.ZoteroPane.getSelectedCollection();
            openPreferences(col ? col.key : null);
          },
        },
        {
          menuType: "menuitem",
          l10nID: "eixos-organizer-collection-classify-pending",
          icon: iconURI,
          onCommand: () => classifyCollectionPending(),
        },
      ],
    });
    if (colMenuID) registeredMenus.push(colMenuID);
  }

  async function startup(opts) {
    pluginID = opts.id || pluginID;
    rootURI = opts.rootURI || "";

    // Expose clean API on Zotero namespace for preference pane & dialogs
    Zotero.EixosOrganizer = {
      pluginID,
      rootURI,
      config: EixosConfig,
      organizer: EixosOrganizer,
      classifier: EixosClassifier,
      openPreferences,
      consumePendingSourceKey,
      classifySelectedItems,
      classifyCollectionPending,
      organizeCollectionWithPlan,
      reloadSyncedConfigInteractive,
      showToast,
    };

    // Inject FTL into any already-open main windows
    for (const win of Zotero.getMainWindows()) {
      injectFTL(win);
    }

    // Register native preference pane
    if (Zotero.PreferencePanes && typeof Zotero.PreferencePanes.register === "function") {
      prefPaneID = await Zotero.PreferencePanes.register({
        pluginID,
        id: "eixos-organizer-prefpane",
        src: rootURI + "chrome/content/preferences.xhtml",
        label: "Eixos Organizer",
        image: rootURI + "chrome/content/icon.svg",
        scripts: [rootURI + "chrome/content/preferences.js"],
        stylesheets: [rootURI + "chrome/content/preferences.css"],
      });
    }

    registerMenus();

    notifierID = Zotero.Notifier.registerObserver(
      notifierObserver,
      ["collection-item"],
      "eixos-organizer"
    );

    // Wait for Zotero schema/UI initialization before auto-syncing config
    Zotero.initializationPromise
      .then(() => EixosConfig.initAndSyncConfig())
      .catch((e) => Zotero.debug("EixosMain initAndSyncConfig error: " + e));
  }

  function onMainWindowLoad(win) {
    injectFTL(win);
  }

  function onMainWindowUnload() {}

  function shutdown() {
    if (pendingTimer && _clearTimeout) {
      _clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    if (notifierID) {
      Zotero.Notifier.unregisterObserver(notifierID);
      notifierID = null;
    }
    if (Zotero.MenuManager && typeof Zotero.MenuManager.unregisterMenu === "function") {
      for (const id of registeredMenus) {
        try {
          Zotero.MenuManager.unregisterMenu(id);
        } catch (e) {}
      }
    }
    registeredMenus = [];
    if (prefPaneID && Zotero.PreferencePanes && typeof Zotero.PreferencePanes.unregister === "function") {
      try {
        Zotero.PreferencePanes.unregister(prefPaneID);
      } catch (e) {}
      prefPaneID = null;
    }
    delete Zotero.EixosOrganizer;
  }

  return {
    startup,
    shutdown,
    onMainWindowLoad,
    onMainWindowUnload,
  };
})();

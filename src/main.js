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

  function openInteractiveDialog(item, rule, targetTree, initialClassification, settings) {
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
      const dialogResult = openInteractiveDialog(item, rule, targetTree, classification, effectiveSettings);
      if (!dialogResult || !dialogResult.confirmed) {
        return { status: "cancelled" };
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
          ? ` | Nova(s) pasta(s): ${applied.createdNames.join(", ")}`
          : "";
      if (!opts.silentToast) {
        showToast(
          "Eixos Organizer",
          [
            `“${itemMeta.title.slice(0, 70)}”`,
            `Vinculado a: ${applied.linkedNames.join(" • ")}${createdMsg}`,
          ],
          5000
        );
      }
      return { status: "linked", applied };
    }
    return { status: "unchanged" };
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
      while (queue.length > 0) {
        const task = queue.shift();
        try {
          const item = await Zotero.Items.getAsync(task.itemID);
          if (!item || item.deleted) continue;
          await processSingleItem(item, task.rule, { force: false });
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
    for (const item of items) {
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
        await processSingleItem(item, rule, { force: true, forceInteractive: true });
      } catch (err) {
        showToast("Eixos Organizer — Erro", [String(err.message || err)], 6000);
      }
    }
  }

  async function classifyCollectionPending(collection) {
    const win = getActiveWindow();
    const pane = win && win.ZoteroPane;
    const col = collection || (pane && pane.getSelectedCollection());
    if (!col) {
      showToast("Eixos Organizer", ["Selecione primeiro uma coleção no painel esquerdo."], 4000);
      return;
    }

    const rule = EixosConfig.findRuleForSourceCollection(col.key, col.libraryID);
    if (!rule) {
      showToast(
        "Eixos Organizer",
        [`A coleção “${col.name}” ainda não está configurada. Abrindo configurações…`],
        4500
      );
      openPreferences(col.key);
      return;
    }

    const settings = EixosConfig.getSettings();
    const { pending } = await EixosOrganizer.getPendingItemsInSource(
      col.libraryID,
      rule.sourceKey,
      rule.targetRootKey,
      settings.skipAlreadyClassified
    );

    if (pending.length === 0) {
      showToast(
        "Eixos Organizer",
        [`Todos os itens de “${col.name}” já estão classificados em sua árvore temática!`],
        4500
      );
      return;
    }

    let linked = 0;
    let skipped = 0;
    const silentToast = pending.length > 3;

    if (silentToast && settings.mode === "auto") {
      showToast(
        "Eixos Organizer",
        [`Classificando ${pending.length} item(ns) pendente(s) de “${col.name}”…`],
        4000
      );
    }

    for (const item of pending) {
      try {
        const res = await processSingleItem(item, rule, {
          force: true,
          silentToast,
        });
        if (res.status === "linked") linked++;
        else skipped++;
      } catch (err) {
        Zotero.debug("EixosMain.classifyCollectionPending error: " + err);
        skipped++;
      }
    }

    showToast(
      "Eixos Organizer — Lote concluído",
      [`Coleção “${col.name}”: ${linked} vinculado(s), ${skipped} pulado(s)/inalterado(s).`],
      6000
    );
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

/* global Zotero, ChromeUtils, EixosI18n, EixosConfig, EixosOrganizer, EixosClassifier */

var EixosMain = (function () {
  function tr(key, params) {
    return typeof EixosI18n !== "undefined" ? EixosI18n.t(key, params) : key;
  }
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
      pw.changeHeadline(headline || tr("pluginName"));
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
      i18n: EixosI18n,
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

  async function processSingleItem(rawItem, rule, options) {
    const opts = options || {};
    const settings = EixosConfig.getSettings();
    const libID = rule.libraryID || (rawItem && rawItem.libraryID) || Zotero.Libraries.userLibraryID;

    if (!rawItem || rawItem.deleted) return { status: "skipped" };
    if (rawItem.isNote && rawItem.isNote() && !rawItem.parentItemID) return { status: "skipped" };

    // Always resolve child attachment / child note to its parent bibliographic item!
    const item = await EixosOrganizer.resolveParentItem(rawItem);
    if (!item || item.deleted) return { status: "skipped" };
    if (item.isNote && item.isNote()) return { status: "skipped" };

    const targetTree = await EixosOrganizer.getTargetTree(libID, rule.targetRootKey);
    if (!opts.force && settings.skipAlreadyClassified && EixosOrganizer.isItemAlreadyInTargetTree(item, targetTree)) {
      return { status: "already_classified" };
    }

    const itemMeta = EixosOrganizer.getItemMetadata(item);
    if (!itemMeta || !itemMeta.title) {
      return { status: "needs_retry" };
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
      recentHandled.set(`${rule.sourceKey}:${item.id}`, Date.now());
      const createdMsg =
        applied.createdNames.length > 0
          ? tr("toastNewFolderSuffix", { names: applied.createdNames.join(", ") })
          : "";
      if (!opts.silentToast) {
        showToast(
          tr("toastOrganizedTitle"),
          [
            `“${itemMeta.title.slice(0, 72)}”`,
            tr("toastLinkedLine", {
              root: targetTree.root.name,
              names: applied.linkedNames.join(" • "),
              created: createdMsg,
            }),
          ],
          5500
        );
      }
      return { status: "linked", applied };
    }

    if (!opts.silentToast && !useInteractive) {
      showToast(
        tr("toastNoChangeTitle"),
        [
          `“${itemMeta.title.slice(0, 72)}”`,
          classification.reason || tr("toastNoChangeFallback"),
        ],
        5500
      );
    }
    return { status: "unchanged" };
  }

  let activePlanWindow = null;

  function openPlanDialog(dialogArgs) {
    const win = getActiveWindow();
    if (!win) return null;

    if (activePlanWindow && !activePlanWindow.closed) {
      try {
        activePlanWindow.close();
      } catch (e) {}
    }

    // IMPORTANT: Must NOT be `modal`! A modal openDialog blocks Zotero's main window
    // event loop and deadlocks Zotero.Collection.saveTx() / Zotero.Item.saveTx()
    // when executing directly from inside the open dialog.
    activePlanWindow = win.openDialog(
      "chrome://eixos-organizer/content/plan-dialog.xhtml",
      "eixos-organizer-plan-dialog",
      "chrome,dialog,centerscreen,resizable,width=840,height=740",
      dialogArgs
    );

    return activePlanWindow;
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
   * 1. Auto-detects existing thematic subcollection (nested or sibling) or prepares to create "<Source> - Por Eixo e Tema" inside source.
   * 2. Scans all pending items in memory (using parent metadata + hybrid AI/keyword cross-check).
   * 3. Opens ONE Plan Review dialog allowing manual index creation, item reassignment, and replanning.
   * 4. Executes INSIDE the open dialog with live progress and direct DB verification of every indexed item.
   */
  async function organizeCollectionWithPlan(collection) {
    const win = getActiveWindow();
    const pane = win && win.ZoteroPane;
    const col = collection || (pane && pane.getSelectedCollection());
    if (!col) {
      showToast(tr("pluginName"), [tr("toastSelectCollection")], 4000);
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
        tr("pluginName"),
        [tr("toastIsTargetRoot1", { name: col.name }), tr("toastIsTargetRoot2")],
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
        tr("pluginName"),
        [
          existingTarget
            ? tr("toastAllOrganized", { source: col.name, dest: existingTarget.name })
            : tr("toastNoDirectItems", { source: col.name }),
        ],
        4500
      );
      return;
    }

    const itemsMeta = pending
      .map((it) => EixosOrganizer.getItemMetadata(it))
      .filter((m) => m && m.title);

    if (itemsMeta.length === 0) {
      showToast(tr("pluginName"), [tr("toastNoValidTitle", { source: col.name })], 4500);
      return;
    }

    const effectiveSettings = Object.assign({}, settings, {
      allowCreateNew: Boolean(
        settings.allowCreateNew && (!rule || rule.allowCreateNew !== false)
      ),
    });

    // Show immediate progress toast while building plan (especially helpful when calling AI API)
    const usingAI =
      effectiveSettings.engine === "ai" ||
      (effectiveSettings.engine === "hybrid" && EixosClassifier.hasAIConfigured(effectiveSettings));
    let loadingToast = showToast(
      tr("toastPlanningTitle"),
      [
        usingAI
          ? tr("toastPlanningAI", { count: itemsMeta.length, source: col.name })
          : tr("toastPlanningOff", { count: itemsMeta.length, source: col.name }),
      ],
      60000
    );

    // 3. Build complete plan in memory (ZERO writes to Zotero yet)
    let plan;
    try {
      plan = await EixosClassifier.buildBatchPlan(itemsMeta, targetTree, effectiveSettings);
    } catch (err) {
      if (loadingToast && typeof loadingToast.close === "function") {
        try {
          loadingToast.close();
        } catch (e) {}
      }
      showToast(tr("toastPlanErrTitle"), [String(err.message || err)], 6500);
      return;
    }

    if (loadingToast && typeof loadingToast.close === "function") {
      try {
        loadingToast.close();
      } catch (e) {}
    }

    const itemTitleByID = new Map(itemsMeta.map((m) => [m.id, m.title]));
    const defaultNewRootName = `${col.name} - ${tr("defaultRootSuffix")}`;

    // 4. Execution + real DB verification callback (runs while Plan dialog remains open!)
    const executePlanInDialog = async (payload, onProgress) => {
      const reportProgress = (percent, message) => {
        if (typeof onProgress === "function") {
          try {
            onProgress({ percent, message });
          } catch (e) {}
        }
      };

      reportProgress(10, tr("progPrepTarget"));
      let targetRootCol = null;
      if (existingTarget) {
        targetRootCol = Zotero.Collections.getByLibraryAndKey(libID, existingTarget.key);
      }
      if (!targetRootCol) {
        targetRootCol = await EixosOrganizer.ensureTargetRootInsideSource(
          libID,
          col.key,
          payload.newRootName || defaultNewRootName
        );
        existingTarget = {
          id: targetRootCol.id,
          key: targetRootCol.key,
          name: targetRootCol.name,
          path: `${col.name} / ${targetRootCol.name}`,
        };
      }

      // Register managed rule automatically so future items dropped in `col` are organized in real time
      await ensureRuleRegistered(libID, col, targetRootCol);

      // Create/resolve all approved axis subcollections (including empty manual indices!)
      const totalGroups = (payload.groups || []).length;
      reportProgress(18, tr("progCreatingAxes", { count: totalGroups }));
      const itemToColIDs = new Map();
      const colNameByID = new Map();
      const createdAxisNames = [];

      for (let gIdx = 0; gIdx < totalGroups; gIdx++) {
        const grp = payload.groups[gIdx];
        reportProgress(
          18 + Math.round(((gIdx + 1) / Math.max(1, totalGroups)) * 12),
          tr("progPreparingAxis", { idx: gIdx + 1, total: totalGroups, name: grp.name })
        );
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

        colNameByID.set(axisCol.id, axisCol.name);

        for (const itemID of grp.itemIds || []) {
          if (!itemToColIDs.has(itemID)) itemToColIDs.set(itemID, new Set());
          itemToColIDs.get(itemID).add(axisCol.id);
        }
        if (Zotero.Promise && typeof Zotero.Promise.delay === "function") {
          await Zotero.Promise.delay(10);
        }
      }

      // Helper to apply links to a map of itemID -> Set(colIDs)
      const linkBatch = async (mapToLink, basePct, spanPct) => {
        const entries = Array.from(mapToLink.entries());
        let linkedItems = 0;
        let totalLinks = 0;
        for (let idx = 0; idx < entries.length; idx++) {
          const [itemID, colIDs] = entries[idx];
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
          if (entries.length > 0 && (idx % 3 === 0 || idx === entries.length - 1)) {
            const pct = basePct + Math.round(((idx + 1) / entries.length) * spanPct);
            reportProgress(pct, tr("progIndexingItems", { done: idx + 1, total: entries.length }));
            if (Zotero.Promise && typeof Zotero.Promise.delay === "function") {
              await Zotero.Promise.delay(5);
            }
          }
        }
        return { linkedItems, totalLinks };
      };

      const { linkedItems, totalLinks } = await linkBatch(itemToColIDs, 30, 50);

      // Verify EVERY planned item/link directly against Zotero's collectionItems table!
      reportProgress(85, tr("progVerifyingDB"));
      let verification = await EixosOrganizer.verifyItemsIndexed(
        libID,
        itemToColIDs,
        colNameByID,
        itemTitleByID
      );

      // Automatic retry once if any link failed verification on first pass
      if (verification.missing && verification.missing.length > 0) {
        reportProgress(92, tr("progRetryingMissing", { count: verification.missing.length }));
        const retryMap = new Map();
        for (const m of verification.missing) {
          retryMap.set(m.itemID, new Set(m.missingColIDs));
        }
        await linkBatch(retryMap, 92, 5);
        verification = await EixosOrganizer.verifyItemsIndexed(
          libID,
          itemToColIDs,
          colNameByID,
          itemTitleByID
        );
      }

      reportProgress(100, tr("progDone"));
      return {
        targetRootName: targetRootCol.name,
        createdAxisNames,
        linkedItems,
        totalLinks,
        verification,
      };
    };

    // 5. Open ONE review + live verified execution dialog
    openPlanDialog({
      i18n: EixosI18n,
      sourceName: col.name,
      totalPending: itemsMeta.length,
      existingTarget,
      defaultNewRootName,
      allItems: itemsMeta,
      plan,
      replan: async (forceEngine, manualAxes) => {
        const latest = EixosConfig.getSettings();
        return EixosClassifier.buildBatchPlan(itemsMeta, targetTree, latest, forceEngine, manualAxes);
      },
      executePlan: executePlanInDialog,
      result: null,
    });
  }

  function scheduleDrain(delayMs) {
    if (pendingTimer && _clearTimeout) {
      _clearTimeout(pendingTimer);
    }
    if (_setTimeout) {
      pendingTimer = _setTimeout(() => {
        pendingTimer = null;
        drainQueue();
      }, delayMs || 1200);
    } else {
      drainQueue();
    }
  }

  function enqueueAddedItem(collectionID, itemID, attempt) {
    const col = Zotero.Collections.get(collectionID);
    if (!col) return;
    const rule = EixosConfig.findRuleForSourceCollection(col.key, col.libraryID);
    if (!rule) return;

    const retryCount = attempt || 0;
    const dedupKey = `${rule.sourceKey}:${itemID}`;
    const now = Date.now();
    const last = recentHandled.get(dedupKey);
    if (retryCount === 0 && last && now - last < 3000) return;

    // Avoid duplicate entries in queue
    if (queue.some((q) => q.itemID === itemID && q.rule.sourceKey === rule.sourceKey)) {
      return;
    }

    queue.push({ collectionID, itemID, rule, attempt: retryCount });
    scheduleDrain(retryCount === 0 ? 1200 : 1800 * retryCount);
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
          // If metadata wasn't ready yet (e.g., Zotero still fetching PDF metadata), retry up to 3 times!
          if (res && res.status === "needs_retry" && (task.attempt || 0) < 3) {
            const nextAttempt = (task.attempt || 0) + 1;
            const retryDelay = nextAttempt * 2000;
            if (_setTimeout) {
              _setTimeout(() => {
                enqueueAddedItem(task.collectionID, task.itemID, nextAttempt);
              }, retryDelay);
            }
          }
        } catch (err) {
          Zotero.debug("EixosMain.drainQueue item error: " + err);
          if ((task.attempt || 0) < 1 && _setTimeout) {
            // One automatic retry on transient error so organization requests never silently vanish
            _setTimeout(() => {
              enqueueAddedItem(task.collectionID, task.itemID, (task.attempt || 0) + 1);
            }, 2500);
          } else {
            showToast(tr("toastWarnTitle"), [String(err.message || err)], 6000);
          }
        }
      }
    } finally {
      isProcessingQueue = false;
      if (queue.length > 0) {
        scheduleDrain(500);
      }
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
        enqueueAddedItem(collectionID, itemID, 0);
      }
    },
  };

  async function classifySelectedItems() {
    const win = getActiveWindow();
    const pane = win && win.ZoteroPane;
    if (!pane) return;

    const rawSelected = pane.getSelectedItems() || [];
    const seenIds = new Set();
    const items = [];
    for (const raw of rawSelected) {
      const resolved = await EixosOrganizer.resolveParentItem(raw);
      if (!resolved || resolved.deleted) continue;
      if (resolved.isNote && resolved.isNote()) continue;
      if (seenIds.has(resolved.id)) continue;
      seenIds.add(resolved.id);
      items.push(resolved);
    }
    if (items.length === 0) {
      showToast(tr("pluginName"), [tr("toastSelectItem")], 3500);
      return;
    }

    const settings = EixosConfig.getSettings();
    const enabledRules = settings.rules.filter((r) => r.enabled);
    if (enabledRules.length === 0) {
      showToast(tr("pluginName"), [tr("toastNoRulesOpening")], 4000);
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
        showToast(tr("toastErrTitle"), [String(err.message || err)], 6000);
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
          tr("pluginName"),
          [tr("toastSyncedLoaded", { count: payload.rules.length })],
          4500
        );
      } else {
        const discovered = await EixosConfig.autoDiscoverRules();
        showToast(
          tr("pluginName"),
          [
            discovered.length > 0
              ? tr("toastAutoDiscovered", { count: discovered.length })
              : tr("toastNoSyncedYet"),
          ],
          5000
        );
      }
    } catch (err) {
      showToast(tr("toastErrTitle"), [String(err.message || err)], 6000);
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
      i18n: EixosI18n,
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
        label: "Organizer",
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

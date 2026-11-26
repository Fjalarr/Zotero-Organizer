/* global window, document */

(function () {
  const args = window.arguments && window.arguments[0];
  if (!args) return;

  function t(key, params) {
    if (args.i18n && typeof args.i18n.t === "function") {
      return args.i18n.t(key, params);
    }
    try {
      const openerI18n =
        window.opener &&
        window.opener.Zotero &&
        window.opener.Zotero.EixosOrganizer &&
        window.opener.Zotero.EixosOrganizer.i18n;
      if (openerI18n && typeof openerI18n.t === "function") {
        return openerI18n.t(key, params);
      }
    } catch (e) {}
    return key;
  }

  let groupsState = [];
  const expandedGroups = new Set();
  const pickerOpenGroups = new Set();
  const allItems = Array.isArray(args.allItems) ? args.allItems : [];
  let isExecuting = false;
  let executionFinished = false;
  let lastFailedRetryPayload = null;

  function $(id) {
    return document.getElementById(id);
  }

  function normalizeText(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getManualAxisNames() {
    return groupsState
      .filter((g) => g.isManual && g.name.trim())
      .map((g) => g.name.trim());
  }

  function applyStaticStrings() {
    document.title = t("planWindowTitle");
    $("plan-subtitle").textContent = t("planSubtitle");
    $("plan-btn-re-ai").textContent = t("planBtnReAI");
    $("plan-btn-re-off").textContent = t("planBtnReOffline");
    $("plan-manual-label").textContent = t("planManualLabel");
    $("plan-manual-input").placeholder = t("planManualPlaceholder");
    $("plan-btn-add-manual").textContent = t("planBtnAddManual");
    $("plan-search").placeholder = t("planSearchPlaceholder");
    $("plan-btn-select-all").textContent = t("planBtnSelectAll");
    $("plan-btn-unselect-all").textContent = t("planBtnUnselectAll");
    $("plan-btn-retry-missing").textContent = t("planBtnRetryMissing");
    $("plan-btn-cancel").textContent = t("planBtnCancel");
    $("plan-btn-execute").textContent = t("planBtnExecute");
  }

  function applyPlan(plan) {
    // Preserve any empty manually-created axes that might not appear in the replanned result
    const prevManuals = groupsState.filter((g) => g.isManual && g.name.trim());

    groupsState = ((plan && plan.groups) || []).map((g) => ({
      id: g.id,
      isNew: Boolean(g.isNew),
      isManual: Boolean(g.isManual),
      existingKey: g.existingKey || null,
      parentKey: g.parentKey || "__ROOT__",
      parentName: g.parentName || null,
      name: g.name || "",
      enabled: g.enabled !== false,
      items: Array.isArray(g.items) ? g.items.slice() : [],
    }));

    for (const pm of prevManuals) {
      const exists = groupsState.some((g) => normalizeText(g.name) === normalizeText(pm.name));
      if (!exists) {
        groupsState.unshift(pm);
      }
    }

    const badge = $("plan-engine-badge");
    const eng = (plan && plan.engineUsed) || "offline";
    if (eng.startsWith("ai:")) {
      badge.textContent = t("planBadgeAI", { provider: eng.slice(3) });
      badge.className = "plan-badge plan-badge-ai";
    } else {
      badge.textContent = t("planBadgeOffline");
      badge.className = "plan-badge plan-badge-offline";
    }
    $("plan-reason").textContent = (plan && plan.reason) || "";
  }

  function getActiveGroups() {
    // Manual new axes are allowed even with 0 items (creates empty index folder!)
    return groupsState.filter(
      (g) => g.enabled && g.name.trim() && (g.items.length > 0 || g.isManual)
    );
  }

  function updateSummary() {
    const activeGroups = getActiveGroups();
    const uniqueItemIds = new Set();
    let totalLinks = 0;
    let newFolders = 0;

    for (const g of activeGroups) {
      if (g.isNew) newFolders++;
      for (const it of g.items) {
        uniqueItemIds.add(it.id);
        totalLinks++;
      }
    }

    const newPart =
      newFolders > 0 ? t("planSummaryNewPart", { count: newFolders }) : "";

    $("plan-summary").textContent =
      activeGroups.length > 0
        ? t("planSummaryFmt", {
            axes: activeGroups.length,
            items: uniqueItemIds.size,
            links: totalLinks,
            newPart,
          })
        : t("planSummaryNone");

    const btn = $("plan-btn-execute");
    if (executionFinished) {
      btn.disabled = false;
      btn.textContent = t("planBtnDoneClose");
    } else if (isExecuting) {
      btn.disabled = true;
      btn.textContent = t("planBtnExecuting");
    } else {
      btn.disabled = activeGroups.length === 0;
      btn.textContent =
        uniqueItemIds.size > 0
          ? t("planBtnExecuteCount", { count: uniqueItemIds.size })
          : t("planBtnExecute");
    }
  }

  function getNextAxisNumber() {
    let maxNum = 0;
    for (const g of groupsState) {
      const m = String(g.name || "").trim().match(/^(\d{1,2})\s*[-–—]/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return maxNum > 0 ? maxNum + 1 : groupsState.length + 1;
  }

  function formatNumberedManualAxis(rawName) {
    const clean = String(rawName || "").trim();
    const existing = clean.match(/^(\d{1,2})\s*[-–—]\s*(.+)$/);
    if (existing) {
      return `${String(parseInt(existing[1], 10)).padStart(2, "0")} - ${existing[2].trim()}`;
    }
    return `${String(getNextAxisNumber()).padStart(2, "0")} - ${clean}`;
  }

  function addManualAxis() {
    if (isExecuting || executionFinished) return;
    const inp = $("plan-manual-input");
    const rawName = inp.value.trim();
    if (!rawName) return;

    const stripNum = (s) => normalizeText(String(s || "").replace(/^\d{1,2}\s*[-–—]\s*/, ""));
    const existing = groupsState.find((g) => stripNum(g.name) === stripNum(rawName));
    if (existing) {
      existing.enabled = true;
      existing.isManual = true;
      expandedGroups.add(existing.id);
      inp.value = "";
      renderGroups($("plan-search").value);
      updateSummary();
      return;
    }

    const name = formatNumberedManualAxis(rawName);
    const id = `manual:${Date.now()}:${stripNum(name)}`;
    groupsState.unshift({
      id,
      isNew: true,
      isManual: true,
      existingKey: null,
      parentKey: "__ROOT__",
      parentName: null,
      name,
      enabled: true,
      items: [],
    });
    pickerOpenGroups.add(id);
    inp.value = "";
    renderGroups($("plan-search").value);
    updateSummary();
  }

  function addItemToGroup(group, item) {
    if (!group.items.some((x) => x.id === item.id)) {
      group.items.push(item);
    }
  }

  function removeItemFromGroup(group, itemId) {
    group.items = group.items.filter((x) => x.id !== itemId);
  }

  function renderGroups(filterText) {
    const container = $("plan-groups");
    container.textContent = "";
    const q = normalizeText(filterText);

    if (groupsState.length === 0) {
      const empty = document.createElement("div");
      empty.className = "plan-empty";
      empty.textContent = t("planEmptyGroups");
      container.appendChild(empty);
      return;
    }

    for (let i = 0; i < groupsState.length; i++) {
      const g = groupsState[i];
      const matchesGroup =
        !q ||
        normalizeText(g.name).includes(q) ||
        normalizeText(g.parentName).includes(q) ||
        g.items.some((it) => normalizeText(it.title).includes(q));
      if (!matchesGroup) continue;

      const card = document.createElement("div");
      card.className = "plan-group-card" + (g.enabled ? "" : " plan-group-disabled");

      const head = document.createElement("div");
      head.className = "plan-group-head";

      const left = document.createElement("div");
      left.className = "plan-group-left";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = g.enabled;
      cb.disabled = isExecuting || executionFinished;
      cb.addEventListener("change", () => {
        g.enabled = cb.checked;
        card.className = "plan-group-card" + (g.enabled ? "" : " plan-group-disabled");
        updateSummary();
      });
      left.appendChild(cb);

      const tag = document.createElement("span");
      if (g.isManual) {
        tag.className = "plan-badge plan-badge-manual";
        tag.textContent = t("planBadgeManual");
      } else if (g.isNew) {
        tag.className = "plan-badge plan-badge-new";
        tag.textContent = t("planBadgeNewFolder");
      } else {
        tag.className = "plan-badge plan-badge-exist";
        tag.textContent = t("planBadgeExisting");
      }
      left.appendChild(tag);

      if (g.isNew) {
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "plan-group-name-input";
        nameInput.value = g.name;
        nameInput.disabled = isExecuting || executionFinished;
        nameInput.title = t("planAxisNameTitle");
        nameInput.addEventListener("input", () => {
          g.name = nameInput.value;
          updateSummary();
        });
        left.appendChild(nameInput);
      } else {
        const titleSpan = document.createElement("span");
        titleSpan.className = "plan-group-name";
        titleSpan.textContent = g.parentName ? `${g.parentName} › ${g.name}` : g.name;
        left.appendChild(titleSpan);
      }

      const right = document.createElement("div");
      right.className = "plan-group-right";

      const cnt = document.createElement("span");
      cnt.className = "plan-count";
      cnt.textContent = t("planItemCount", { count: g.items.length });
      right.appendChild(cnt);

      if (!isExecuting && !executionFinished && allItems.length > 0) {
        const assignBtn = document.createElement("button");
        assignBtn.type = "button";
        assignBtn.className = "plan-btn plan-btn-sm";
        assignBtn.textContent = pickerOpenGroups.has(g.id)
          ? t("planBtnCloseAssign")
          : t("planBtnAssign");
        assignBtn.addEventListener("click", () => {
          if (pickerOpenGroups.has(g.id)) pickerOpenGroups.delete(g.id);
          else pickerOpenGroups.add(g.id);
          renderGroups($("plan-search").value);
        });
        right.appendChild(assignBtn);
      }

      const isExpanded = expandedGroups.has(g.id);
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "plan-btn plan-btn-sm";
      toggleBtn.textContent = isExpanded ? t("planBtnHideItems") : t("planBtnViewItems");
      toggleBtn.addEventListener("click", () => {
        if (expandedGroups.has(g.id)) expandedGroups.delete(g.id);
        else expandedGroups.add(g.id);
        renderGroups($("plan-search").value);
      });
      right.appendChild(toggleBtn);

      head.appendChild(left);
      head.appendChild(right);
      card.appendChild(head);

      if (pickerOpenGroups.has(g.id) && !isExecuting && !executionFinished) {
        const pickerWrap = document.createElement("div");
        pickerWrap.className = "plan-picker-wrap";

        const pickerSearch = document.createElement("input");
        pickerSearch.type = "search";
        pickerSearch.className = "plan-picker-search";
        pickerSearch.placeholder = t("planPickerPlaceholder");
        pickerWrap.appendChild(pickerSearch);

        const pickerList = document.createElement("div");
        pickerList.className = "plan-picker-list";

        const renderPickerItems = (pq) => {
          pickerList.textContent = "";
          const normPq = normalizeText(pq);
          const inGroupIds = new Set(g.items.map((x) => x.id));
          for (const it of allItems) {
            const labelText =
              (it.creators && it.creators.length > 0 ? `${it.creators[0]} — ` : "") +
              it.title +
              (it.year ? ` (${it.year})` : "");
            if (normPq && !normalizeText(labelText).includes(normPq)) continue;

            const row = document.createElement("label");
            row.className = "plan-picker-row";
            const icb = document.createElement("input");
            icb.type = "checkbox";
            icb.checked = inGroupIds.has(it.id);
            icb.addEventListener("change", () => {
              if (icb.checked) addItemToGroup(g, it);
              else removeItemFromGroup(g, it.id);
              cnt.textContent = t("planItemCount", { count: g.items.length });
              updateSummary();
            });
            const sp = document.createElement("span");
            sp.textContent = labelText;
            row.appendChild(icb);
            row.appendChild(sp);
            pickerList.appendChild(row);
          }
        };

        pickerSearch.addEventListener("input", () => renderPickerItems(pickerSearch.value));
        renderPickerItems("");
        pickerWrap.appendChild(pickerList);
        card.appendChild(pickerWrap);
      }

      if (isExpanded) {
        const list = document.createElement("ul");
        list.className = "plan-item-list";
        const visibleItems = q
          ? g.items.filter(
              (it) => normalizeText(it.title).includes(q) || normalizeText(g.name).includes(q)
            )
          : g.items;

        if (visibleItems.length === 0) {
          const li = document.createElement("li");
          li.className = "plan-item-empty";
          li.textContent = g.isManual ? t("planManualEmptyHint") : t("planAxisEmptyHint");
          list.appendChild(li);
        } else {
          for (const it of visibleItems) {
            const li = document.createElement("li");
            li.className = "plan-item-row";

            const txt = document.createElement("span");
            txt.className = "plan-item-text";
            const authorPart =
              it.creators && it.creators.length > 0 ? `${it.creators[0]} — ` : "";
            const yearPart = it.year ? ` (${it.year})` : "";
            const fullLine = `${authorPart}${it.title}${yearPart}`;
            txt.textContent = fullLine;
            txt.title = fullLine;
            li.appendChild(txt);

            if (!isExecuting && !executionFinished) {
              const rmBtn = document.createElement("button");
              rmBtn.type = "button";
              rmBtn.className = "plan-item-rm";
              rmBtn.textContent = "×";
              rmBtn.title = t("planItemRmTitle");
              rmBtn.addEventListener("click", () => {
                removeItemFromGroup(g, it.id);
                renderGroups($("plan-search").value);
                updateSummary();
              });
              li.appendChild(rmBtn);
            }

            list.appendChild(li);
          }
        }
        card.appendChild(list);
      }

      container.appendChild(card);
    }
  }

  async function runReplan(forceEngine) {
    if (isExecuting || executionFinished || typeof args.replan !== "function") return;
    const btnAI = $("plan-btn-re-ai");
    const btnOff = $("plan-btn-re-off");
    btnAI.disabled = true;
    btnOff.disabled = true;
    $("plan-btn-execute").disabled = true;
    $("plan-reason").textContent =
      forceEngine === "ai" ? t("planReanalyzingAI") : t("planReanalyzingOff");

    try {
      const manualNames = getManualAxisNames();
      const fresh = await args.replan(forceEngine, manualNames);
      expandedGroups.clear();
      pickerOpenGroups.clear();
      applyPlan(fresh);
      renderGroups($("plan-search").value);
      updateSummary();
    } catch (err) {
      $("plan-reason").textContent = t("planReanalyzeErr", { err: err.message || err });
    } finally {
      btnAI.disabled = false;
      btnOff.disabled = false;
      updateSummary();
    }
  }

  function buildExecutionPayload() {
    const selectedGroups = getActiveGroups().map((g) => ({
      isNew: g.isNew,
      isManual: g.isManual,
      existingKey: g.existingKey,
      parentKey: g.parentKey,
      name: g.name.trim(),
      itemIds: g.items.map((it) => it.id),
    }));
    const newRootName =
      $("plan-dest-input").value.trim() ||
      args.defaultNewRootName ||
      `${args.sourceName} - ${t("defaultRootSuffix")}`;
    return {
      newRootName,
      groups: selectedGroups,
    };
  }

  async function runExecutionInDialog(payload) {
    if (typeof args.executePlan !== "function") {
      args.result = Object.assign({ confirmed: true }, payload);
      window.close();
      return;
    }

    isExecuting = true;
    executionFinished = false;
    lastFailedRetryPayload = null;

    const execBox = $("plan-exec-box");
    const execStatus = $("plan-exec-status");
    const execDetails = $("plan-exec-details");
    const progressBar = $("plan-progress-bar");
    const retryBtn = $("plan-btn-retry-missing");

    execBox.style.display = "flex";
    execBox.className = "plan-exec-box plan-exec-running";
    retryBtn.style.display = "none";
    execDetails.textContent = "";
    progressBar.style.width = "10%";
    execStatus.textContent = t("planExecStart");

    $("plan-btn-cancel").disabled = true;
    $("plan-btn-re-ai").disabled = true;
    $("plan-btn-re-off").disabled = true;
    $("plan-btn-add-manual").disabled = true;
    $("plan-manual-input").disabled = true;
    $("plan-dest-input").disabled = true;
    renderGroups($("plan-search").value);
    updateSummary();

    const onProgress = (info) => {
      if (!info) return;
      if (info.message) execStatus.textContent = info.message;
      if (typeof info.percent === "number") {
        progressBar.style.width = Math.max(5, Math.min(100, info.percent)) + "%";
      }
    };

    try {
      const report = await args.executePlan(payload, onProgress);
      const v = report && report.verification;
      progressBar.style.width = "100%";

      if (v && v.missing && v.missing.length > 0) {
        execBox.className = "plan-exec-box plan-exec-warn";
        execStatus.textContent = t("planExecWarn", {
          verified: v.verifiedItems,
          total: v.totalPlannedItems,
          missing: v.missing.length,
        });
        const lines = v.missing.slice(0, 8).map((m) =>
          t("planExecMissingLine", {
            title: m.title,
            cols: m.missingColNames.join(", "),
          })
        );
        if (v.missing.length > 8) {
          lines.push(t("planExecMoreMissing", { count: v.missing.length - 8 }));
        }
        execDetails.textContent = lines.join("\n");
        lastFailedRetryPayload = payload;
        retryBtn.style.display = "inline-block";
        isExecuting = false;
        executionFinished = true;
        args.result = { confirmed: true, executedInDialog: true, report };
      } else {
        execBox.className = "plan-exec-box plan-exec-ok";
        const createdPart =
          report.createdAxisNames && report.createdAxisNames.length > 0
            ? t("planExecCreatedPart", { count: report.createdAxisNames.length })
            : t("planExecReusedPart");
        execStatus.textContent = t("planExecOk", {
          verified: v.verifiedItems,
          total: v.totalPlannedItems,
        });
        execDetails.textContent = t("planExecDetailsOk", {
          dest: report.targetRootName,
          vLinks: v.verifiedLinks,
          tLinks: v.totalPlannedLinks,
          created: createdPart,
        });
        isExecuting = false;
        executionFinished = true;
        args.result = { confirmed: true, executedInDialog: true, report };
      }
    } catch (err) {
      execBox.className = "plan-exec-box plan-exec-error";
      execStatus.textContent = t("planExecErr", { err: err.message || err });
      execDetails.textContent = t("planExecErrSafe");
      isExecuting = false;
      executionFinished = false;
      $("plan-btn-cancel").disabled = false;
      $("plan-btn-re-ai").disabled = false;
      $("plan-btn-re-off").disabled = false;
      $("plan-btn-add-manual").disabled = false;
      $("plan-manual-input").disabled = false;
      $("plan-dest-input").disabled = false;
    }

    $("plan-btn-cancel").style.display = executionFinished ? "none" : "inline-block";
    renderGroups($("plan-search").value);
    updateSummary();
  }

  function init() {
    applyStaticStrings();

    $("plan-title").textContent = t("planTitleFmt", {
      source: args.sourceName,
      count: args.totalPending,
    });

    if (args.existingTarget) {
      $("plan-dest-label").textContent = t("planDestExistingLabel");
      const ex = $("plan-dest-existing");
      ex.style.display = "inline";
      ex.textContent = args.existingTarget.path || args.existingTarget.name;
      $("plan-dest-input").style.display = "none";
      const b = $("plan-dest-badge");
      b.textContent = t("planBadgeExisting");
      b.className = "plan-badge plan-badge-exist";
    } else {
      $("plan-dest-label").textContent = t("planDestNewLabel", { source: args.sourceName });
      $("plan-dest-existing").style.display = "none";
      const inp = $("plan-dest-input");
      inp.style.display = "inline-block";
      inp.value = args.defaultNewRootName || `${args.sourceName} - ${t("defaultRootSuffix")}`;
      const b = $("plan-dest-badge");
      b.textContent = t("planBadgeNewSub");
      b.className = "plan-badge plan-badge-new";
    }

    applyPlan(args.plan);
    renderGroups("");
    updateSummary();

    $("plan-btn-add-manual").addEventListener("click", addManualAxis);
    $("plan-manual-input").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        addManualAxis();
      }
    });

    $("plan-search").addEventListener("input", (ev) => {
      renderGroups(ev.target.value);
    });

    $("plan-btn-select-all").addEventListener("click", () => {
      if (isExecuting || executionFinished) return;
      for (const g of groupsState) g.enabled = true;
      renderGroups($("plan-search").value);
      updateSummary();
    });

    $("plan-btn-unselect-all").addEventListener("click", () => {
      if (isExecuting || executionFinished) return;
      for (const g of groupsState) g.enabled = false;
      renderGroups($("plan-search").value);
      updateSummary();
    });

    $("plan-btn-re-ai").addEventListener("click", () => runReplan("ai"));
    $("plan-btn-re-off").addEventListener("click", () => runReplan("offline"));

    $("plan-btn-retry-missing").addEventListener("click", () => {
      if (lastFailedRetryPayload) {
        runExecutionInDialog(lastFailedRetryPayload);
      }
    });

    $("plan-btn-cancel").addEventListener("click", () => {
      if (isExecuting) return;
      args.result = { confirmed: false };
      window.close();
    });

    $("plan-btn-execute").addEventListener("click", () => {
      if (isExecuting) return;
      if (executionFinished) {
        window.close();
        return;
      }
      runExecutionInDialog(buildExecutionPayload());
    });

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !isExecuting) {
        if (!executionFinished) {
          args.result = { confirmed: false };
        }
        window.close();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

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

  const selectedKeys = new Set();
  const suggestedKeys = new Set();
  let newSubcollections = [];

  function $(id) {
    return document.getElementById(id);
  }

  function applyStaticStrings() {
    document.title = t("clsWindowTitle");
    $("dlg-search").placeholder = t("clsSearchPlaceholder");
    $("dlg-btn-re-ai").textContent = t("clsBtnReAI");
    $("dlg-btn-re-off").textContent = t("clsBtnReOff");
    $("dlg-new-title").textContent = t("clsNewTitle");
    $("dlg-new-name").placeholder = t("clsNewPlaceholder");
    $("dlg-btn-add-new").textContent = t("clsBtnAddNew");
    $("dlg-btn-abort").textContent = t("clsBtnAbort");
    $("dlg-btn-cancel").textContent = t("clsBtnSkip");
    $("dlg-btn-confirm").textContent = t("clsBtnConfirm");
  }

  function applyClassificationToState(classification) {
    selectedKeys.clear();
    suggestedKeys.clear();
    newSubcollections = [];

    for (const k of (classification && classification.selectedKeys) || []) {
      selectedKeys.add(k);
      suggestedKeys.add(k);
    }
    for (const ns of (classification && classification.proposedNew) || []) {
      if (ns && ns.name) {
        newSubcollections.push({ parentKey: ns.parentKey || "__ROOT__", name: ns.name });
      }
    }

    const badge = $("dlg-engine-badge");
    const eng = (classification && classification.engineUsed) || "offline";
    if (eng.startsWith("ai:")) {
      badge.textContent = t("planBadgeAI", { provider: eng.slice(3) });
      badge.className = "dlg-badge dlg-badge-ai";
    } else {
      badge.textContent = t("planBadgeOffline");
      badge.className = "dlg-badge dlg-badge-offline";
    }
    $("dlg-reason").textContent = (classification && classification.reason) || "";
  }

  function updateSummary() {
    const total = selectedKeys.size + newSubcollections.length;
    const parts = [];
    if (selectedKeys.size > 0) parts.push(t("clsSummaryExisting", { count: selectedKeys.size }));
    if (newSubcollections.length > 0) {
      parts.push(t("clsSummaryNew", { count: newSubcollections.length }));
    }
    $("dlg-summary").textContent =
      total > 0 ? t("clsSummarySelected", { parts: parts.join(" + ") }) : t("clsSummaryNone");
    $("dlg-btn-confirm").disabled = total === 0;
  }

  function renderTree(filterText) {
    const container = $("dlg-tree");
    container.textContent = "";
    const q = String(filterText || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    const matches = (str) => {
      if (!q) return true;
      return String(str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(q);
    };

    const eixos = (args.targetTree && args.targetTree.eixos) || [];
    if (eixos.length === 0) {
      const empty = document.createElement("div");
      empty.className = "dlg-empty";
      empty.textContent = t("clsEmptyTree");
      container.appendChild(empty);
      return;
    }

    for (const eixo of eixos) {
      const group = document.createElement("div");
      group.className = "dlg-eixo-group";

      if (eixo.isLeaf && eixo.leaf) {
        if (!matches(eixo.name)) continue;
        group.appendChild(makeLeafRow(eixo.leaf, true));
        container.appendChild(group);
        continue;
      }

      const visibleChildren = (eixo.children || []).filter(
        (ch) => matches(ch.name) || matches(eixo.name)
      );
      if (visibleChildren.length === 0) continue;

      const header = document.createElement("div");
      header.className = "dlg-eixo-header";
      header.textContent = eixo.name;
      group.appendChild(header);

      for (const leaf of visibleChildren) {
        group.appendChild(makeLeafRow(leaf, false));
      }
      container.appendChild(group);
    }
  }

  function makeLeafRow(leaf, isRootLeaf) {
    const label = document.createElement("label");
    label.className =
      "dlg-leaf-row" +
      (isRootLeaf ? " dlg-leaf-root" : "") +
      (suggestedKeys.has(leaf.key) ? " dlg-leaf-suggested" : "");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selectedKeys.has(leaf.key);
    cb.addEventListener("change", () => {
      if (cb.checked) selectedKeys.add(leaf.key);
      else selectedKeys.delete(leaf.key);
      updateSummary();
    });

    const nameSpan = document.createElement("span");
    nameSpan.className = "dlg-leaf-name";
    nameSpan.textContent = leaf.name;

    const right = document.createElement("span");
    right.className = "dlg-leaf-right";

    if (suggestedKeys.has(leaf.key)) {
      const pill = document.createElement("span");
      pill.className = "dlg-pill";
      pill.textContent = t("clsPillSuggested");
      right.appendChild(pill);
    }

    const cnt = document.createElement("span");
    cnt.className = "dlg-count";
    cnt.textContent = `${leaf.itemCount || 0}`;
    right.appendChild(cnt);

    label.appendChild(cb);
    label.appendChild(nameSpan);
    label.appendChild(right);
    return label;
  }

  function parentLabel(parentKey) {
    if (!parentKey || parentKey === "__ROOT__") {
      return t("clsRootParentFmt", { root: args.targetTree.root.name });
    }
    const found = (args.targetTree.eixos || []).find((e) => e.key === parentKey);
    return found ? found.name : parentKey;
  }

  function renderNewList() {
    const box = $("dlg-new-list");
    box.textContent = "";
    for (let i = 0; i < newSubcollections.length; i++) {
      const spec = newSubcollections[i];
      const chip = document.createElement("div");
      chip.className = "dlg-new-chip";

      const txt = document.createElement("span");
      txt.textContent = t("clsNewChipFmt", {
        name: spec.name,
        parent: parentLabel(spec.parentKey),
      });

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "dlg-chip-rm";
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        newSubcollections.splice(i, 1);
        renderNewList();
        updateSummary();
      });

      chip.appendChild(txt);
      chip.appendChild(rm);
      box.appendChild(chip);
    }
  }

  function populateNewParentSelect() {
    const sel = $("dlg-new-parent");
    sel.textContent = "";

    const rootOpt = document.createElement("option");
    rootOpt.value = "__ROOT__";
    rootOpt.textContent = t("clsNewRootOpt", { root: args.targetTree.root.name });
    sel.appendChild(rootOpt);

    for (const eixo of (args.targetTree && args.targetTree.eixos) || []) {
      const opt = document.createElement("option");
      opt.value = eixo.key;
      opt.textContent = t("clsNewInsideOpt", { eixo: eixo.name });
      sel.appendChild(opt);
    }
  }

  async function runReclassify(forceEngine) {
    if (typeof args.reclassify !== "function") return;
    const btnAI = $("dlg-btn-re-ai");
    const btnOff = $("dlg-btn-re-off");
    btnAI.disabled = true;
    btnOff.disabled = true;
    $("dlg-reason").textContent =
      forceEngine === "ai" ? t("clsReanalyzingAI") : t("clsReanalyzingOff");

    try {
      const fresh = await args.reclassify(forceEngine);
      applyClassificationToState(fresh);
      renderTree($("dlg-search").value);
      renderNewList();
      updateSummary();
    } catch (err) {
      $("dlg-reason").textContent = t("planReanalyzeErr", { err: err.message || err });
    } finally {
      btnAI.disabled = false;
      btnOff.disabled = false;
    }
  }

  function init() {
    applyStaticStrings();

    const meta = args.itemMeta || {};
    $("dlg-title").textContent = meta.title || t("clsNoTitle");
    const metaParts = [];
    if (meta.creators && meta.creators.length > 0) {
      metaParts.push(meta.creators.slice(0, 3).join("; "));
    }
    if (meta.year) metaParts.push(meta.year);
    if (meta.publicationTitle) metaParts.push(meta.publicationTitle);
    $("dlg-meta").textContent = metaParts.join(" • ");
    const progressSuffix =
      args.batchTotal && args.batchTotal > 1
        ? t("clsBatchProgress", { index: args.batchIndex || 1, total: args.batchTotal })
        : "";
    $("dlg-route").textContent = `${args.sourceName}  →  ${args.targetTree.root.name}${progressSuffix}`;

    const abortBtn = $("dlg-btn-abort");
    if (abortBtn && args.batchTotal && args.batchTotal > 1) {
      abortBtn.style.display = "inline-block";
      abortBtn.addEventListener("click", () => {
        args.result = { confirmed: false, action: "abort" };
        window.close();
      });
    }

    if (!args.allowCreateNew) {
      $("dlg-new-box").style.display = "none";
    }

    populateNewParentSelect();
    applyClassificationToState(args.classification);
    renderTree("");
    renderNewList();
    updateSummary();

    $("dlg-search").addEventListener("input", (ev) => {
      renderTree(ev.target.value);
    });

    $("dlg-btn-add-new").addEventListener("click", () => {
      const name = $("dlg-new-name").value.trim();
      if (!name) return;
      const parentKey = $("dlg-new-parent").value || "__ROOT__";
      newSubcollections.push({ parentKey, name });
      $("dlg-new-name").value = "";
      renderNewList();
      updateSummary();
    });

    $("dlg-new-name").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        $("dlg-btn-add-new").click();
      }
    });

    $("dlg-btn-re-ai").addEventListener("click", () => runReclassify("ai"));
    $("dlg-btn-re-off").addEventListener("click", () => runReclassify("offline"));

    $("dlg-btn-cancel").addEventListener("click", () => {
      args.result = { confirmed: false, action: "skip" };
      window.close();
    });

    $("dlg-btn-confirm").addEventListener("click", () => {
      args.result = {
        confirmed: true,
        action: "confirm",
        selectedKeys: Array.from(selectedKeys),
        newSubcollections: newSubcollections.slice(),
      };
      window.close();
    });

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        args.result = { confirmed: false, action: "abort" };
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

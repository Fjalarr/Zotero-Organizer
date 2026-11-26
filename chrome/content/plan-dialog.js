/* global window, document */

(function () {
  const args = window.arguments && window.arguments[0];
  if (!args) return;

  let groupsState = [];
  const expandedGroups = new Set();

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

  function applyPlan(plan) {
    groupsState = ((plan && plan.groups) || []).map((g) => ({
      id: g.id,
      isNew: Boolean(g.isNew),
      existingKey: g.existingKey || null,
      parentKey: g.parentKey || "__ROOT__",
      parentName: g.parentName || null,
      name: g.name || "",
      enabled: g.enabled !== false,
      items: Array.isArray(g.items) ? g.items.slice() : [],
    }));

    const badge = $("plan-engine-badge");
    const eng = (plan && plan.engineUsed) || "offline";
    if (eng.startsWith("ai:")) {
      badge.textContent = "IA (" + eng.slice(3) + ")";
      badge.className = "plan-badge plan-badge-ai";
    } else {
      badge.textContent = "Modo Offline";
      badge.className = "plan-badge plan-badge-offline";
    }
    $("plan-reason").textContent = (plan && plan.reason) || "";
  }

  function updateSummary() {
    const activeGroups = groupsState.filter((g) => g.enabled && g.name.trim() && g.items.length > 0);
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

    const parts = [
      `${activeGroups.length} eixo(s)`,
      `${uniqueItemIds.size} item(ns) único(s) (${totalLinks} vínculo(s))`,
    ];
    if (newFolders > 0) {
      parts.push(`${newFolders} nova(s) pasta(s)`);
    }

    $("plan-summary").textContent =
      activeGroups.length > 0
        ? parts.join(" • ") + " — nada será apagado"
        : "Nenhum eixo selecionado";

    const btn = $("plan-btn-execute");
    btn.disabled = activeGroups.length === 0;
    btn.textContent =
      uniqueItemIds.size > 0
        ? `Executar Organização (${uniqueItemIds.size} itens)`
        : "Executar Organização";
  }

  function renderGroups(filterText) {
    const container = $("plan-groups");
    container.textContent = "";
    const q = normalizeText(filterText);

    if (groupsState.length === 0) {
      const empty = document.createElement("div");
      empty.className = "plan-empty";
      empty.textContent =
        "Nenhum eixo foi sugerido para os itens pendentes. Tente reanalisar com IA ou verifique as configurações.";
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
      cb.addEventListener("change", () => {
        g.enabled = cb.checked;
        card.className = "plan-group-card" + (g.enabled ? "" : " plan-group-disabled");
        updateSummary();
      });
      left.appendChild(cb);

      const tag = document.createElement("span");
      tag.className = g.isNew ? "plan-badge plan-badge-new" : "plan-badge plan-badge-exist";
      tag.textContent = g.isNew ? "Nova pasta" : "Existente";
      left.appendChild(tag);

      if (g.isNew) {
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "plan-group-name-input";
        nameInput.value = g.name;
        nameInput.title = "Você pode renomear este eixo antes de executar";
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
      cnt.textContent = `${g.items.length} item(ns)`;
      right.appendChild(cnt);

      const isExpanded = expandedGroups.has(g.id);
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "plan-btn plan-btn-sm";
      toggleBtn.textContent = isExpanded ? "Ocultar ▴" : "Ver itens ▾";
      toggleBtn.addEventListener("click", () => {
        if (expandedGroups.has(g.id)) expandedGroups.delete(g.id);
        else expandedGroups.add(g.id);
        renderGroups($("plan-search").value);
      });
      right.appendChild(toggleBtn);

      head.appendChild(left);
      head.appendChild(right);
      card.appendChild(head);

      if (isExpanded) {
        const list = document.createElement("ul");
        list.className = "plan-item-list";
        const visibleItems = q
          ? g.items.filter(
              (it) => normalizeText(it.title).includes(q) || normalizeText(g.name).includes(q)
            )
          : g.items;

        for (const it of visibleItems) {
          const li = document.createElement("li");
          const authorPart =
            it.creators && it.creators.length > 0 ? `${it.creators[0]} — ` : "";
          const yearPart = it.year ? ` (${it.year})` : "";
          li.textContent = `${authorPart}${it.title}${yearPart}`;
          list.appendChild(li);
        }
        card.appendChild(list);
      }

      container.appendChild(card);
    }
  }

  async function runReplan(forceEngine) {
    if (typeof args.replan !== "function") return;
    const btnAI = $("plan-btn-re-ai");
    const btnOff = $("plan-btn-re-off");
    btnAI.disabled = true;
    btnOff.disabled = true;
    $("plan-reason").textContent =
      forceEngine === "ai"
        ? "Analisando coleção inteira com IA… aguarde alguns segundos."
        : "Recalculando plano offline…";

    try {
      const fresh = await args.replan(forceEngine);
      expandedGroups.clear();
      applyPlan(fresh);
      renderGroups($("plan-search").value);
      updateSummary();
    } catch (err) {
      $("plan-reason").textContent = "Erro ao reanalisar: " + (err.message || err);
    } finally {
      btnAI.disabled = false;
      btnOff.disabled = false;
    }
  }

  function init() {
    $("plan-title").textContent = `Organizar “${args.sourceName}” (${args.totalPending} pendente(s))`;

    if (args.existingTarget) {
      $("plan-dest-label").textContent = "Usando subcoleção temática já existente:";
      const ex = $("plan-dest-existing");
      ex.style.display = "inline";
      ex.textContent = args.existingTarget.path || args.existingTarget.name;
      $("plan-dest-input").style.display = "none";
      const b = $("plan-dest-badge");
      b.textContent = "Existente";
      b.className = "plan-badge plan-badge-exist";
    } else {
      $("plan-dest-label").textContent = `Criar subcoleção dentro de “${args.sourceName}”:`;
      $("plan-dest-existing").style.display = "none";
      const inp = $("plan-dest-input");
      inp.style.display = "inline-block";
      inp.value = args.defaultNewRootName || `${args.sourceName} - Por Eixo e Tema`;
      const b = $("plan-dest-badge");
      b.textContent = "Nova subcoleção";
      b.className = "plan-badge plan-badge-new";
    }

    applyPlan(args.plan);
    renderGroups("");
    updateSummary();

    $("plan-search").addEventListener("input", (ev) => {
      renderGroups(ev.target.value);
    });

    $("plan-btn-select-all").addEventListener("click", () => {
      for (const g of groupsState) g.enabled = true;
      renderGroups($("plan-search").value);
      updateSummary();
    });

    $("plan-btn-unselect-all").addEventListener("click", () => {
      for (const g of groupsState) g.enabled = false;
      renderGroups($("plan-search").value);
      updateSummary();
    });

    $("plan-btn-re-ai").addEventListener("click", () => runReplan("ai"));
    $("plan-btn-re-off").addEventListener("click", () => runReplan("offline"));

    $("plan-btn-cancel").addEventListener("click", () => {
      args.result = { confirmed: false };
      window.close();
    });

    $("plan-btn-execute").addEventListener("click", () => {
      const selectedGroups = groupsState
        .filter((g) => g.enabled && g.name.trim() && g.items.length > 0)
        .map((g) => ({
          isNew: g.isNew,
          existingKey: g.existingKey,
          parentKey: g.parentKey,
          name: g.name.trim(),
          itemIds: g.items.map((it) => it.id),
        }));
      const newRootName =
        $("plan-dest-input").value.trim() ||
        args.defaultNewRootName ||
        `${args.sourceName} - Por Eixo e Tema`;
      args.result = {
        confirmed: true,
        newRootName,
        groups: selectedGroups,
      };
      window.close();
    });

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        args.result = { confirmed: false };
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

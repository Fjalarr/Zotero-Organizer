/* global Zotero */

var EixosClassifier = (function () {
  const STOPWORDS = new Set([
    // PT
    "a", "as", "o", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
    "em", "no", "na", "nos", "nas", "por", "para", "com", "sem", "sob", "sobre",
    "entre", "ate", "apos", "como", "que", "quem", "qual", "quais", "se", "ao", "aos",
    "e", "ou", "mas", "mais", "menos", "muito", "muitos", "seu", "sua", "seus", "suas",
    "este", "esta", "esse", "essa", "isso", "isto", "pelo", "pela", "pelos", "pelas",
    "num", "numa", "ser", "estar", "ter", "fazer", "foi", "sao", "era", "nao", "sim",
    "vol", "volume", "livro", "edicao", "editora", "ensaio", "ensaios", "estudo", "estudos",
    "introducao", "capitulo", "parte", "analise", "reflexoes", "notas", "sobre", "historia",
    // EN
    "the", "and", "for", "with", "from", "that", "this", "these", "those", "into",
    "onto", "upon", "about", "above", "below", "under", "over", "between", "through",
    "during", "before", "after", "within", "without", "against", "among", "toward",
    "towards", "its", "their", "his", "her", "our", "your", "are", "was", "were", "been",
    "have", "has", "had", "not", "but", "can", "will", "new", "modern", "history",
    "book", "press", "university", "edition", "review", "study", "studies", "essays",
    // ES
    "el", "la", "los", "las", "un", "una", "unos", "unas", "del", "al", "con", "sin",
    "por", "para", "sobre", "entre", "hacia", "desde", "hasta", "como", "que", "cual",
    "sus", "este", "esta", "ese", "esa", "son", "fue", "mas", "pero", "historia",
  ]);

  function tokenize(text) {
    if (!text) return [];
    const normalized = String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf\uac00-\ud7af]+/g, " ");
    return normalized
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
  }

  function addWeightedTokens(map, text, weight) {
    for (const tok of tokenize(text)) {
      map.set(tok, (map.get(tok) || 0) + weight);
    }
  }

  function classifyOffline(itemMeta, targetTree, settings) {
    const leaves = targetTree.leaves || [];
    if (leaves.length === 0) {
      return {
        engineUsed: "offline",
        selectedKeys: [],
        proposedNew: [],
        reason: "A coleção destino ainda não possui eixos/temas cadastrados.",
        suggestNewHint: true,
        scores: [],
      };
    }

    // Build item token vector
    const itemVec = new Map();
    addWeightedTokens(itemVec, itemMeta.title, 3.5);
    addWeightedTokens(itemVec, (itemMeta.tags || []).join(" "), 2.5);
    addWeightedTokens(itemVec, itemMeta.abstractNote, 1.5);
    addWeightedTokens(itemVec, (itemMeta.creators || []).join(" "), 1.2);
    addWeightedTokens(itemVec, itemMeta.publicationTitle, 1.0);

    // Build leaf token vectors & document frequency across leaves
    const leafVecs = [];
    const docFreq = new Map();

    for (const leaf of leaves) {
      const vec = new Map();
      addWeightedTokens(vec, leaf.name, 4.0);
      if (leaf.parentName) {
        addWeightedTokens(vec, leaf.parentName, 2.2);
      }
      for (const t of leaf.sampleTitles || []) {
        addWeightedTokens(vec, t, 1.0);
      }
      for (const tg of leaf.sampleTags || []) {
        addWeightedTokens(vec, tg, 1.4);
      }
      for (const tok of vec.keys()) {
        docFreq.set(tok, (docFreq.get(tok) || 0) + 1);
      }
      leafVecs.push({ leaf, vec });
    }

    const N = leaves.length;
    const idf = (tok) => Math.log((N + 1) / ((docFreq.get(tok) || 0) + 1)) + 1.0;

    // Cosine similarity with TF-IDF
    let itemNormSq = 0;
    const itemWeighted = new Map();
    for (const [tok, tf] of itemVec.entries()) {
      const w = (1 + Math.log(tf)) * idf(tok);
      itemWeighted.set(tok, w);
      itemNormSq += w * w;
    }
    const itemNorm = Math.sqrt(itemNormSq) || 1;

    const scored = [];
    for (const { leaf, vec } of leafVecs) {
      let dot = 0;
      let normSq = 0;
      const matchedTerms = [];
      for (const [tok, tf] of vec.entries()) {
        const w = (1 + Math.log(tf)) * idf(tok);
        normSq += w * w;
        if (itemWeighted.has(tok)) {
          const contrib = w * itemWeighted.get(tok);
          dot += contrib;
          matchedTerms.push({ tok, contrib });
        }
      }
      const sim = dot / (itemNorm * (Math.sqrt(normSq) || 1));
      matchedTerms.sort((a, b) => b.contrib - a.contrib);
      scored.push({
        key: leaf.key,
        name: leaf.name,
        fullLabel: leaf.fullLabel,
        score: sim,
        matchedTerms: matchedTerms.slice(0, 5).map((m) => m.tok),
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const maxTargets = settings.maxTargets || 3;
    const topScore = scored[0] ? scored[0].score : 0;

    const selected = [];
    if (topScore >= 0.03) {
      const cutoff = Math.max(0.035, topScore * 0.52);
      for (const s of scored) {
        if (selected.length >= maxTargets) break;
        if (s.score >= cutoff) {
          selected.push(s);
        }
      }
    }

    const suggestNewHint = topScore < 0.055;
    let reason = "";
    if (selected.length > 0) {
      const topTerms = selected[0].matchedTerms.slice(0, 4).join(", ");
      reason = `Modo offline (similaridade textual): termos em comum como "${topTerms || "título/tema"}".`;
    } else {
      reason =
        "Modo offline: pouca correspondência com os temas atuais — você pode selecionar manualmente ou criar um novo tema.";
    }

    return {
      engineUsed: "offline",
      selectedKeys: selected.map((s) => s.key),
      proposedNew: [],
      reason,
      suggestNewHint,
      scores: scored.slice(0, 6),
    };
  }

  function buildPrompt(itemMeta, targetTree, settings) {
    const treeSummary = (targetTree.eixos || []).map((eixo) => {
      if (eixo.isLeaf && eixo.leaf) {
        return {
          eixoKey: eixo.key,
          eixoName: eixo.name,
          directLeaf: true,
          sampleTitles: (eixo.leaf.sampleTitles || []).slice(0, 6),
        };
      }
      return {
        eixoKey: eixo.key,
        eixoName: eixo.name,
        subtemas: (eixo.children || []).map((ch) => ({
          key: ch.key,
          name: ch.name,
          sampleTitles: (ch.sampleTitles || []).slice(0, 5),
        })),
      };
    });

    const maxTargets = settings.maxTargets || 3;
    const allowNew = Boolean(settings.allowCreateNew);

    return (
      `Você é um bibliotecário e historiador especialista organizando uma biblioteca acadêmica no Zotero.\n` +
      `Classifique o novo item abaixo nas subcoleções temáticas já existentes (pode escolher de 1 até ${maxTargets} subcoleções se a obra for interdisciplinar).\n\n` +
      `REGRAS IMPORTANTES:\n` +
      `1. Use EXATAMENTE as chaves ("key" de subtema ou "eixoKey" quando directLeaf=true) listadas na estrutura abaixo.\n` +
      `2. ${
        allowNew
          ? `Se o item tratar de um tema claramente novo que NÃO se encaixe bem em nenhuma subcoleção existente, proponha no máximo 1 nova subcoleção em "new_subcollections", escolhendo o "parent_key" de um eixo existente (ou "__ROOT__" apenas se exigir um eixo totalmente novo) e seguindo o padrão de numeração/estilo das pastas existentes.`
          : `NÃO proponha novas subcoleções (mantenha "new_subcollections": []). Escolha apenas entre as existentes.`
      }\n` +
      `3. Responda EXCLUSIVAMENTE com um JSON válido, sem texto fora do JSON, no formato:\n` +
      `{\n` +
      `  "selected_keys": ["KEY1", "KEY2"],\n` +
      `  "new_subcollections": [{"parent_key": "EIXO_KEY_OU___ROOT__", "name": "Nome do novo tema"}],\n` +
      `  "reason": "Justificativa curta em português (1-2 frases)."\n` +
      `}\n\n` +
      `ESTRUTURA ATUAL DE EIXOS E TEMAS:\n` +
      `${JSON.stringify(treeSummary, null, 2)}\n\n` +
      `NOVO ITEM A CLASSIFICAR:\n` +
      `${JSON.stringify(
        {
          title: itemMeta.title,
          creators: itemMeta.creators,
          year: itemMeta.year,
          itemType: itemMeta.itemType,
          publicationTitle: itemMeta.publicationTitle,
          publisher: itemMeta.publisher,
          tags: itemMeta.tags,
          abstractNote: itemMeta.abstractNote,
        },
        null,
        2
      )}`
    );
  }

  function extractJsonFromText(rawText) {
    if (!rawText) throw new Error("Resposta vazia da IA.");
    let cleaned = String(rawText).trim();
    const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) cleaned = fenced[1].trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("A resposta da IA não contém JSON válido.");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  async function callGemini(prompt, settings) {
    const apiKey = settings.aiApiKey;
    if (!apiKey) throw new Error("Chave de API do Gemini não configurada.");
    const model = settings.aiModel || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const resp = await Zotero.HTTP.request("POST", url, {
      headers: { "Content-Type": "application/json" },
      body,
      timeout: 30000,
    });
    const data = JSON.parse(resp.responseText);
    const text =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.map((p) => p.text || "").join("\n");
    return extractJsonFromText(text);
  }

  async function callOpenAICompatible(prompt, settings, isCustom) {
    const endpoint = isCustom
      ? settings.aiEndpoint || "http://localhost:11434/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = settings.aiModel || (isCustom ? "llama3.1" : "gpt-4o-mini");

    if (!isCustom && !settings.aiApiKey) {
      throw new Error("Chave de API da OpenAI não configurada.");
    }

    const headers = { "Content-Type": "application/json" };
    if (settings.aiApiKey) {
      headers.Authorization = `Bearer ${settings.aiApiKey}`;
    }

    const payload = {
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Responda sempre apenas com JSON válido conforme o esquema solicitado.",
        },
        { role: "user", content: prompt },
      ],
    };

    const resp = await Zotero.HTTP.request("POST", endpoint, {
      headers,
      body: JSON.stringify(payload),
      timeout: 35000,
    });
    const data = JSON.parse(resp.responseText);
    const text =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;
    return extractJsonFromText(text);
  }

  function hasAIConfigured(settings) {
    if (settings.aiProvider === "custom") {
      return Boolean(settings.aiEndpoint);
    }
    return Boolean(settings.aiApiKey);
  }

  async function classifyWithAI(itemMeta, targetTree, settings) {
    const prompt = buildPrompt(itemMeta, targetTree, settings);
    let parsed;
    if (settings.aiProvider === "gemini") {
      parsed = await callGemini(prompt, settings);
    } else if (settings.aiProvider === "openai") {
      parsed = await callOpenAICompatible(prompt, settings, false);
    } else {
      parsed = await callOpenAICompatible(prompt, settings, true);
    }

    const validLeafKeys = new Set((targetTree.leaves || []).map((l) => l.key));
    const validEixoKeys = new Set((targetTree.eixos || []).map((e) => e.key));

    const selectedKeys = [];
    for (const k of Array.isArray(parsed.selected_keys) ? parsed.selected_keys : []) {
      if (validLeafKeys.has(k) && !selectedKeys.includes(k)) {
        selectedKeys.push(k);
      }
    }

    const proposedNew = [];
    if (settings.allowCreateNew && Array.isArray(parsed.new_subcollections)) {
      for (const ns of parsed.new_subcollections) {
        if (!ns || !ns.name || !String(ns.name).trim()) continue;
        const pKey =
          ns.parent_key && validEixoKeys.has(ns.parent_key) ? ns.parent_key : "__ROOT__";
        proposedNew.push({
          parentKey: pKey,
          name: String(ns.name).trim(),
        });
      }
    }

    return {
      engineUsed: `ai:${settings.aiProvider}`,
      selectedKeys: selectedKeys.slice(0, settings.maxTargets || 3),
      proposedNew: proposedNew.slice(0, 2),
      reason: String(parsed.reason || "Classificado via IA.").trim(),
      suggestNewHint: proposedNew.length > 0,
      scores: [],
    };
  }

  async function classifyItem(itemMeta, targetTree, settings, forceEngine) {
    const engine = forceEngine || settings.engine || "hybrid";

    if (engine === "offline") {
      return classifyOffline(itemMeta, targetTree, settings);
    }

    if (engine === "ai" || (engine === "hybrid" && hasAIConfigured(settings))) {
      try {
        return await classifyWithAI(itemMeta, targetTree, settings);
      } catch (err) {
        Zotero.debug("EixosClassifier: AI error: " + err);
        if (engine === "ai") {
          throw err;
        }
        const fallback = classifyOffline(itemMeta, targetTree, settings);
        fallback.reason = `Fallback offline (IA indisponível: ${err.message || err}). ${fallback.reason}`;
        fallback.aiError = String(err.message || err);
        return fallback;
      }
    }

    const offline = classifyOffline(itemMeta, targetTree, settings);
    if (engine === "hybrid" && !hasAIConfigured(settings)) {
      offline.reason = `Modo offline ativo (configure uma chave de IA nas preferências para classificação semântica avançada). ${offline.reason}`;
    }
    return offline;
  }

  async function testAIConnection(settings) {
    const pingPrompt = 'Responda apenas com este JSON: {"ok": true, "message": "Conexão OK"}';
    if (settings.aiProvider === "gemini") {
      return callGemini(pingPrompt, settings);
    }
    if (settings.aiProvider === "openai") {
      return callOpenAICompatible(pingPrompt, settings, false);
    }
    return callOpenAICompatible(pingPrompt, settings, true);
  }

  return {
    classifyOffline,
    classifyWithAI,
    classifyItem,
    testAIConnection,
    hasAIConfigured,
  };
})();

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

  const OFFLINE_TOPIC_SEEDS = [
    {
      name: "Teoria da História e Historiografia",
      keywords: [
        "historiografia", "historiography", "historiografico", "historicidade", "historicity",
        "teoria", "koselleck", "hartog", "ricoeur", "benjamin", "bloch", "braudel", "white",
        "conceitos", "conceptual", "temporalidade", "temporality", "presentismo", "anacronismo",
        "metodologia", "methodology", "arquivos", "archive", "documento", "monumento", "fontes",
        "narrativa", "epistemologia", "tempo", "passado", "passados", "historical",
      ],
    },
    {
      name: "Teoria Social, Filosofia Política e Capitalismo",
      keywords: [
        "marx", "marxismo", "marxism", "marxist", "gramsci", "capital", "capitalismo", "capitalism",
        "capitalista", "economia", "economy", "economic", "politica", "political", "soberania",
        "sovereignty", "estado", "state", "fascismo", "fascism", "neofascismo", "populismo",
        "populism", "hegemonia", "hegemony", "ideologia", "ideology", "classe", "class",
        "neoliberalismo", "neoliberalism", "liberalismo", "liberalism", "democracia", "democracy",
        "biopoder", "necropolitica", "sociologia", "sociology", "filosofia", "philosophy",
        "trabalho", "labor", "labour", "acumulacao", "reproducao", "burguesia", "proletariado",
      ],
    },
    {
      name: "Estudos Pós-Coloniais, Colonialismo e Imperialismo",
      keywords: [
        "colonial", "colonialismo", "colonialism", "pos-colonial", "postcolonial", "post-colonial",
        "decolonial", "descolonial", "imperialismo", "imperialism", "imperio", "empire", "imperial",
        "subalterno", "subaltern", "orientalismo", "orientalism", "eurocentrismo", "eurocentrism",
        "metropole", "colonia", "colony", "settler", "povoamento", "terceiro", "global", "south",
        "sul", "anticolonial", "anti-colonial", "descolonizacao", "decolonization", "spivak",
        "said", "fanon", "mbembe", "chakrabarty", "prakash", "bhabha",
      ],
    },
    {
      name: "Ásia Oriental, Japão e Coreia",
      keywords: [
        "japao", "japan", "japanese", "japones", "japonesa", "coreia", "korea", "korean", "coreano",
        "coreana", "china", "chinese", "chines", "asia", "asian", "asiatico", "east", "manchuria",
        "manchukuo", "taiwan", "okinawa", "hiroshima", "nagasaki", "toquio", "tokyo", "seoul",
        "meiji", "showa", "pacifico", "pacific", "pan-asianism", "ienaga", "maruyama", "dower",
        "chosen", "joseon", "oriental", "nippon",
      ],
    },
    {
      name: "Memória, Trauma e Justiça de Transição",
      keywords: [
        "memoria", "memory", "memories", "trauma", "traumatic", "traumatico", "testemunho",
        "testimony", "witness", "witnesses", "testify", "esquecimento", "forgetting", "luto",
        "silencio", "silence", "justica", "justice", "transicao", "transitional", "tribunal",
        "tribunals", "court", "crimes", "crime", "reparacao", "reparacoes", "reparation",
        "reparations", "comissao", "verdade", "truth", "anistia", "ditadura", "dictatorship",
        "holocausto", "holocaust", "genocidio", "genocide", "nuremberg", "hague", "haia",
        "impunidade", "impunity", "vitimas", "victims", "responsabilidade", "perlaboracao",
        "war", "guerra", "atrocidades", "atrocities", "sierra", "leone",
      ],
    },
    {
      name: "Gênero, Feminismo e Violência Sexual",
      keywords: [
        "genero", "gender", "mulher", "mulheres", "woman", "women", "feminismo", "feminism",
        "feminista", "feminist", "sexual", "sexualidade", "sexuality", "estupro", "rape",
        "conforto", "comfort", "wianbu", "ianfu", "prostitution", "prostituicao", "escravidao",
        "slavery", "interseccionalidade", "intersectionality", "patriarcado", "patriarchy",
        "maternidade", "maternal", "maes", "corpo", "body", "violencia", "violence", "shame",
        "vergonha", "masculinidade", "feminino", "queer", "hooks", "butler", "federici",
      ],
    },
    {
      name: "Escravidão, Raça e Mundo Atlântico",
      keywords: [
        "escravidao", "slavery", "escravo", "escravos", "slave", "slaves", "abolição", "abolicao",
        "abolition", "alforria", "atlantico", "atlantic", "raca", "race", "racial", "racismo",
        "racism", "negro", "negros", "black", "africa", "african", "africano", "afro", "casta",
        "caste", "diaspora", "plantation", "trafico", "marquese", "hartman", "gilroy",
      ],
    },
    {
      name: "História do Brasil e da América Latina",
      keywords: [
        "brasil", "brazil", "brazilian", "brasileiro", "brasileira", "america", "latina", "latin",
        "ibero", "ibero-americano", "rio", "janeiro", "paulo", "bahia", "minas", "nordeste",
        "argentina", "mexico", "chile", "cuba", "peru", "colombia", "uruguai", "paraguai",
        "vargas", "republica", "imperio", "independencia", "cnv", "indigena", "indigenas",
        "sertão", "sertao", "amazonia", "pernambuco", "fluminense",
      ],
    },
    {
      name: "Cultura, Cinema, Literatura e Artes",
      keywords: [
        "cultura", "culture", "cultural", "cinema", "film", "filme", "filmes", "imagem", "imagens",
        "image", "images", "estetica", "aesthetics", "arte", "artes", "art", "literatura",
        "literature", "literario", "romance", "poesia", "musica", "music", "teatro", "midia",
        "media", "imprensa", "jornalismo", "costumes", "mentalidades", "imaginario", "simbolo",
        "fotografia", "photography", "visual", "religiao", "religion", "sagrado", "demonios",
        "demons", "bruxaria", "romaria", "sincretismo",
      ],
    },
    {
      name: "Educação, Ensino de História e Pedagogia",
      keywords: [
        "educacao", "education", "educational", "ensino", "teaching", "didatica", "didactics",
        "pedagogia", "pedagogy", "escola", "school", "escolar", "curriculo", "curriculum",
        "livro", "didatico", "textbook", "textbooks", "professor", "professores", "docente",
        "docencia", "aprendizagem", "learning", "saber", "universidade", "freire", "charlot",
      ],
    },
    {
      name: "Oriente Médio, Conflitos e História Global",
      keywords: [
        "palestina", "palestine", "palestinian", "israel", "israeli", "nakba", "sionismo",
        "zionist", "oriente", "middle", "east", "arabe", "arab", "islam", "islamico",
        "medieval", "antiguidade", "europa", "europe", "european", "alemanha", "germany",
        "franca", "france", "italia", "italy", "russia", "soviet", "uniao", "estados", "unidos",
        "united", "states", "guerra", "fria", "cold", "war", "internacional", "international",
      ],
    },
  ];

  function scoreAgainstTopicSeeds(itemVec, maxTargets) {
    const scored = [];
    for (const seed of OFFLINE_TOPIC_SEEDS) {
      const kwSet = new Set(seed.keywords.map((k) => tokenize(k)[0]).filter(Boolean));
      let score = 0;
      const matched = [];
      for (const [tok, weight] of itemVec.entries()) {
        if (kwSet.has(tok)) {
          score += weight;
          matched.push({ tok, weight });
        }
      }
      if (score > 0) {
        matched.sort((a, b) => b.weight - a.weight);
        scored.push({
          seed,
          score,
          matchedTerms: matched.slice(0, 4).map((m) => m.tok),
        });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    if (scored.length === 0) return [];
    const top = scored[0].score;
    const cutoff = Math.max(2.0, top * 0.55);
    const chosen = [];
    for (const s of scored) {
      if (chosen.length >= Math.min(maxTargets || 3, 2)) break;
      if (s.score >= cutoff || chosen.length === 0) {
        chosen.push(s);
      }
    }
    return chosen;
  }

  function findExistingLeafByName(leaves, name) {
    const norm = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const target = norm(name);
    return (leaves || []).find((l) => norm(l.name) === target || norm(l.parentName) === target) || null;
  }

  function buildItemVector(itemMeta) {
    const itemVec = new Map();
    addWeightedTokens(itemVec, itemMeta.title, 3.5);
    addWeightedTokens(itemVec, (itemMeta.tags || []).join(" "), 2.5);
    addWeightedTokens(itemVec, itemMeta.abstractNote, 1.5);
    addWeightedTokens(itemVec, (itemMeta.creators || []).join(" "), 1.2);
    addWeightedTokens(itemVec, itemMeta.publicationTitle, 1.0);
    return itemVec;
  }

  function classifyOffline(itemMeta, targetTree, settings) {
    const leaves = targetTree.leaves || [];
    const maxTargets = settings.maxTargets || 3;
    const allowCreateNew = Boolean(settings.allowCreateNew);
    const itemVec = buildItemVector(itemMeta);

    if (leaves.length === 0) {
      if (!allowCreateNew) {
        return {
          engineUsed: "offline",
          selectedKeys: [],
          proposedNew: [],
          reason:
            "A coleção destino está vazia e a criação de novas subcoleções está desativada.",
          suggestNewHint: true,
          scores: [],
        };
      }
      const seedMatches = scoreAgainstTopicSeeds(itemVec, maxTargets);
      if (seedMatches.length > 0) {
        const terms = seedMatches[0].matchedTerms.join(", ");
        return {
          engineUsed: "offline",
          selectedKeys: [],
          proposedNew: seedMatches.map((m) => ({
            parentKey: "__ROOT__",
            name: m.seed.name,
          })),
          reason: `Modo offline (pasta destino vazia): novo eixo sugerido a partir de termos como "${terms}".`,
          suggestNewHint: true,
          scores: [],
        };
      }
      const firstCleanTag = (itemMeta.tags || []).find((t) => String(t).trim().length >= 3);
      const fallbackName = firstCleanTag ? String(firstCleanTag).trim() : "Geral e Outros Temas";
      return {
        engineUsed: "offline",
        selectedKeys: [],
        proposedNew: [{ parentKey: "__ROOT__", name: fallbackName }],
        reason: `Modo offline (pasta destino vazia): criando eixo inicial "${fallbackName}".`,
        suggestNewHint: true,
        scores: [],
      };
    }

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

    const proposedNew = [];
    let reason = "";

    if (selected.length > 0) {
      const topTerms = selected[0].matchedTerms.slice(0, 4).join(", ");
      reason = `Modo offline (similaridade textual): termos em comum como "${topTerms || "título/tema"}".`;
    } else if (allowCreateNew) {
      const seedMatches = scoreAgainstTopicSeeds(itemVec, maxTargets);
      for (const m of seedMatches) {
        const existing = findExistingLeafByName(leaves, m.seed.name);
        if (existing) {
          if (!selected.some((s) => s.key === existing.key)) {
            selected.push({ key: existing.key, name: existing.name, matchedTerms: m.matchedTerms });
          }
        } else {
          proposedNew.push({ parentKey: "__ROOT__", name: m.seed.name });
        }
      }
      if (selected.length > 0 || proposedNew.length > 0) {
        const terms = seedMatches[0] ? seedMatches[0].matchedTerms.join(", ") : "";
        reason =
          proposedNew.length > 0
            ? `Modo offline: novo eixo sugerido a partir de termos como "${terms}".`
            : `Modo offline: correspondência temática com "${terms}".`;
      } else {
        const existingFallback = findExistingLeafByName(leaves, "Geral e Outros Temas");
        if (existingFallback) {
          selected.push({ key: existingFallback.key, name: existingFallback.name, matchedTerms: [] });
          reason = `Modo offline: sem correspondência forte — encaminhado para "${existingFallback.name}".`;
        } else {
          proposedNew.push({ parentKey: "__ROOT__", name: "Geral e Outros Temas" });
          reason = 'Modo offline: sem correspondência forte — sugerindo pasta "Geral e Outros Temas".';
        }
      }
    } else {
      reason =
        "Modo offline: pouca correspondência com os temas atuais — você pode selecionar manualmente ou criar um novo tema.";
    }

    const suggestNewHint = topScore < 0.055 || proposedNew.length > 0;

    return {
      engineUsed: "offline",
      selectedKeys: selected.map((s) => s.key),
      proposedNew,
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

  /**
   * Builds a complete, in-memory batch organization plan (ZERO writes to Zotero)
   * so the user can review all suggested axes and items in a single screen before executing.
   *
   * Returns:
   * {
   *   engineUsed: "offline" | "ai:...",
   *   reason: string,
   *   groups: [
   *     {
   *       id: string,
   *       isNew: boolean,
   *       existingKey: string | null,
   *       parentKey: "__ROOT__" | string,
   *       parentName: string | null,
   *       name: string,
   *       enabled: boolean,
   *       items: [{ id, key, title, creators, year }]
   *     }
   *   ],
   *   unassigned: [{ id, key, title, creators, year }]
   * }
   */
  function buildBatchPlanOffline(itemsMeta, targetTree, settings) {
    const safeTree = targetTree || {
      root: { id: 0, key: "__NEW__", name: "Por Eixo e Tema" },
      eixos: [],
      leaves: [],
    };
    const effectiveSettings = Object.assign({}, settings, {
      allowCreateNew: settings.allowCreateNew !== false,
    });

    const groupsMap = new Map();
    const unassigned = [];

    function ensureGroup(groupId, meta) {
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, Object.assign({ enabled: true, items: [], _seenIds: new Set() }, meta));
      }
      return groupsMap.get(groupId);
    }

    const leafByKey = new Map();
    for (const l of safeTree.leaves || []) {
      leafByKey.set(l.key, l);
    }

    for (const item of itemsMeta) {
      const res = classifyOffline(item, safeTree, effectiveSettings);
      let assignedAny = false;

      for (const k of res.selectedKeys || []) {
        const leaf = leafByKey.get(k);
        if (!leaf) continue;
        const g = ensureGroup(`existing:${k}`, {
          id: `existing:${k}`,
          isNew: false,
          existingKey: k,
          parentKey: leaf.parentKey || "__ROOT__",
          parentName: leaf.parentName || null,
          name: leaf.name,
        });
        if (!g._seenIds.has(item.id)) {
          g._seenIds.add(item.id);
          g.items.push(item);
        }
        assignedAny = true;
      }

      for (const ns of res.proposedNew || []) {
        if (!ns || !ns.name) continue;
        const normName = String(ns.name).trim();
        const keyNorm = normName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const gid = `new:${ns.parentKey || "__ROOT__"}:${keyNorm}`;
        const g = ensureGroup(gid, {
          id: gid,
          isNew: true,
          existingKey: null,
          parentKey: ns.parentKey || "__ROOT__",
          parentName: null,
          name: normName,
        });
        if (!g._seenIds.has(item.id)) {
          g._seenIds.add(item.id);
          g.items.push(item);
        }
        assignedAny = true;
      }

      if (!assignedAny) {
        unassigned.push(item);
      }
    }

    const groups = Array.from(groupsMap.values())
      .map((g) => {
        delete g._seenIds;
        return g;
      })
      .sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        return b.items.length - a.items.length;
      });

    const newCount = groups.filter((g) => g.isNew).length;
    const existCount = groups.length - newCount;
    const reason =
      safeTree.leaves && safeTree.leaves.length > 0
        ? `Plano gerado em Modo Offline: ${existCount} eixo(s) existente(s) reutilizado(s)${
            newCount > 0 ? ` + ${newCount} novo(s) eixo(s) sugerido(s)` : ""
          }.`
        : `Plano inicial gerado em Modo Offline: ${newCount} eixo(s) temático(s) sugerido(s) para ${itemsMeta.length} item(ns).`;

    return {
      engineUsed: "offline",
      reason,
      groups,
      unassigned,
    };
  }

  async function buildBatchPlanWithAI(itemsMeta, targetTree, settings) {
    const safeTree = targetTree || {
      root: { id: 0, key: "__NEW__", name: "Por Eixo e Tema" },
      eixos: [],
      leaves: [],
    };
    const existingLeaves = (safeTree.leaves || []).map((l) => ({
      key: l.key,
      name: l.name,
      parentName: l.parentName || null,
    }));

    const maxTargets = settings.maxTargets || 3;
    const allowNew = settings.allowCreateNew !== false;
    const compactItems = itemsMeta.map((it) => ({
      id: it.id,
      title: it.title,
      creators: (it.creators || []).slice(0, 2),
      year: it.year,
      tags: (it.tags || []).slice(0, 5),
    }));

    // Process in chunks of up to 80 items so prompts stay fast and accurate
    const chunkSize = 80;
    const groupsMap = new Map();
    const itemById = new Map(itemsMeta.map((it) => [it.id, it]));
    const leafByKey = new Map((safeTree.leaves || []).map((l) => [l.key, l]));
    const assignedIds = new Set();

    function addToGroup(gid, meta, item) {
      if (!groupsMap.has(gid)) {
        groupsMap.set(gid, Object.assign({ enabled: true, items: [], _seen: new Set() }, meta));
      }
      const g = groupsMap.get(gid);
      if (!g._seen.has(item.id)) {
        g._seen.add(item.id);
        g.items.push(item);
      }
      assignedIds.add(item.id);
    }

    for (let offset = 0; offset < compactItems.length; offset += chunkSize) {
      const chunk = compactItems.slice(offset, offset + chunkSize);
      const proposedAxesSoFar = Array.from(groupsMap.values())
        .filter((g) => g.isNew)
        .map((g) => g.name);

      const prompt =
        `Você é um bibliotecário e historiador especialista organizando uma coleção acadêmica no Zotero.\n` +
        `Analise TODOS os ${chunk.length} itens abaixo e distribua-os por Eixos Temáticos coerentes (cada item pode ficar em 1 até ${maxTargets} eixos se for interdisciplinar).\n\n` +
        `REGRAS:\n` +
        `1. ${
          existingLeaves.length > 0
            ? `Priorize usar as pastas EXISTENTES listadas abaixo (informando o "existing_key").`
            : `A pasta destino ainda está vazia — proponha entre 4 e 10 eixos temáticos bem estruturados em português.`
        }\n` +
        `2. ${
          allowNew
            ? `Você pode propor novos eixos quando necessário (use "existing_key": null e dê um "name" claro em português). Reutilize nomes já propostos quando fizer sentido.`
            : `NÃO proponha novos eixos; use apenas os "existing_key" listados.`
        }\n` +
        `3. Responda EXCLUSIVAMENTE com JSON válido neste formato:\n` +
        `{\n` +
        `  "axes": [\n` +
        `    {"existing_key": "KEY_OU_NULL", "name": "Nome do Eixo", "item_ids": [1, 2, 3]}\n` +
        `  ],\n` +
        `  "summary": "Resumo curto em português."\n` +
        `}\n\n` +
        `PASTAS EXISTENTES:\n${JSON.stringify(existingLeaves)}\n\n` +
        (proposedAxesSoFar.length > 0
          ? `EIXOS NOVOS JÁ PROPOSTOS NO LOTE:\n${JSON.stringify(proposedAxesSoFar)}\n\n`
          : "") +
        `ITENS A ORGANIZAR:\n${JSON.stringify(chunk)}`;

      let parsed;
      if (settings.aiProvider === "gemini") {
        parsed = await callGemini(prompt, settings);
      } else if (settings.aiProvider === "openai") {
        parsed = await callOpenAICompatible(prompt, settings, false);
      } else {
        parsed = await callOpenAICompatible(prompt, settings, true);
      }

      for (const ax of Array.isArray(parsed.axes) ? parsed.axes : []) {
        if (!ax || !Array.isArray(ax.item_ids)) continue;
        const validLeaf = ax.existing_key && leafByKey.get(ax.existing_key);
        for (const rawId of ax.item_ids) {
          const item = itemById.get(Number(rawId));
          if (!item) continue;
          if (validLeaf) {
            addToGroup(
              `existing:${validLeaf.key}`,
              {
                id: `existing:${validLeaf.key}`,
                isNew: false,
                existingKey: validLeaf.key,
                parentKey: validLeaf.parentKey || "__ROOT__",
                parentName: validLeaf.parentName || null,
                name: validLeaf.name,
              },
              item
            );
          } else if (allowNew && ax.name && String(ax.name).trim()) {
            const cleanName = String(ax.name).trim();
            const norm = cleanName
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase();
            addToGroup(
              `new:__ROOT__:${norm}`,
              {
                id: `new:__ROOT__:${norm}`,
                isNew: true,
                existingKey: null,
                parentKey: "__ROOT__",
                parentName: null,
                name: cleanName,
              },
              item
            );
          }
        }
      }
    }

    const unassigned = itemsMeta.filter((it) => !assignedIds.has(it.id));
    const groups = Array.from(groupsMap.values())
      .map((g) => {
        delete g._seen;
        return g;
      })
      .sort((a, b) => b.items.length - a.items.length);

    return {
      engineUsed: `ai:${settings.aiProvider}`,
      reason: `Plano completo gerado via IA (${settings.aiProvider}): ${groups.length} eixo(s) para ${itemsMeta.length} item(ns).`,
      groups,
      unassigned,
    };
  }

  async function buildBatchPlan(itemsMeta, targetTree, settings, forceEngine) {
    const engine = forceEngine || settings.engine || "hybrid";
    if (engine === "offline") {
      return buildBatchPlanOffline(itemsMeta, targetTree, settings);
    }
    if (engine === "ai" || (engine === "hybrid" && hasAIConfigured(settings))) {
      try {
        return await buildBatchPlanWithAI(itemsMeta, targetTree, settings);
      } catch (err) {
        Zotero.debug("EixosClassifier.buildBatchPlan AI error: " + err);
        if (engine === "ai") throw err;
        const fallback = buildBatchPlanOffline(itemsMeta, targetTree, settings);
        fallback.reason = `Fallback offline (IA indisponível: ${err.message || err}). ${fallback.reason}`;
        return fallback;
      }
    }
    const offline = buildBatchPlanOffline(itemsMeta, targetTree, settings);
    if (engine === "hybrid" && !hasAIConfigured(settings)) {
      offline.reason = `Modo offline ativo (configure uma chave de IA se quiser classificação semântica avançada). ${offline.reason}`;
    }
    return offline;
  }

  return {
    classifyOffline,
    classifyWithAI,
    classifyItem,
    buildBatchPlanOffline,
    buildBatchPlanWithAI,
    buildBatchPlan,
    testAIConnection,
    hasAIConfigured,
  };
})();

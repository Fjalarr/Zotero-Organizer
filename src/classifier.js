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

  function stripNumericPrefix(name) {
    return String(name || "")
      .trim()
      .replace(/^\d{1,2}\s*[-–—]\s*/, "")
      .replace(/^\d{1,2}\.\d{1,2}\s+/, "")
      .trim();
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function getNextRootAxisNumber(targetTree) {
    let maxNum = 0;
    for (const e of (targetTree && targetTree.eixos) || []) {
      const m = String(e.name || "").trim().match(/^(\d{1,2})\s*[-–—]/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return maxNum > 0 ? maxNum + 1 : ((targetTree && targetTree.eixos && targetTree.eixos.length) || 0) + 1;
  }

  function formatNumberedAxisName(rawName, nextNum) {
    const clean = String(rawName || "").trim();
    if (!clean) return clean;
    const existing = clean.match(/^(\d{1,2})\s*[-–—]\s*(.+)$/);
    if (existing) {
      return `${pad2(parseInt(existing[1], 10))} - ${existing[2].trim()}`;
    }
    return `${pad2(nextNum)} - ${clean}`;
  }

  function formatNumberedSubtemaName(rawName, parentEixo, offset) {
    const clean = String(rawName || "").trim();
    if (!clean) return clean;
    if (/^\d{1,2}\.\d{1,2}\s+/.test(clean)) return clean;
    const pm = String((parentEixo && parentEixo.name) || "").trim().match(/^(\d{1,2})\s*[-–—]/);
    if (!pm) return clean;
    const parentNum = parseInt(pm[1], 10);
    let maxSub = 0;
    for (const ch of (parentEixo && parentEixo.children) || []) {
      const cm = String(ch.name || "").trim().match(/^(\d{1,2})\.(\d{1,2})\b/);
      if (cm && parseInt(cm[1], 10) === parentNum) {
        maxSub = Math.max(maxSub, parseInt(cm[2], 10));
      }
    }
    const nextSub = Math.max(maxSub, ((parentEixo && parentEixo.children && parentEixo.children.length) || 0)) + 1 + (offset || 0);
    return `${parentNum}.${nextSub} ${clean}`;
  }

  function applyNumberingToNewGroups(groups, targetTree) {
    let nextNum = getNextRootAxisNumber(targetTree);
    const usedNums = new Set();
    for (const e of (targetTree && targetTree.eixos) || []) {
      const m = String(e.name || "").trim().match(/^(\d{1,2})\s*[-–—]/);
      if (m) usedNums.add(parseInt(m[1], 10));
    }
    // Always renumber newly proposed root axes cleanly & sequentially with no gaps (01, 02, 03...)
    // while preserving explicit numbers on manually-created axes if user typed them.
    for (const g of groups) {
      if (!g.isNew) continue;
      if (!g.parentKey || g.parentKey === "__ROOT__") {
        if (g.isManual) {
          const m = String(g.name || "").trim().match(/^(\d{1,2})\s*[-–—]\s*(.+)$/);
          if (m) {
            const num = parseInt(m[1], 10);
            g.name = `${pad2(num)} - ${m[2].trim()}`;
            usedNums.add(num);
            continue;
          }
        }
        const base = stripNumericPrefix(g.name) || String(g.name || "").trim();
        while (usedNums.has(nextNum)) nextNum++;
        g.name = `${pad2(nextNum)} - ${base}`;
        usedNums.add(nextNum);
        nextNum++;
      }
    }
    return groups;
  }

  function findExistingLeafByName(leaves, name) {
    const norm = (s) =>
      stripNumericPrefix(s)
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
    addWeightedTokens(itemVec, itemMeta.shortTitle, 2.0);
    addWeightedTokens(itemVec, (itemMeta.tags || []).join(" "), 2.5);
    addWeightedTokens(itemVec, itemMeta.abstractNote, 1.5);
    addWeightedTokens(itemVec, (itemMeta.creators || []).join(" "), 1.2);
    addWeightedTokens(itemVec, itemMeta.publicationTitle, 1.2);
    addWeightedTokens(itemVec, itemMeta.series, 1.4);
    addWeightedTokens(itemVec, itemMeta.publisher, 0.8);
    addWeightedTokens(itemVec, itemMeta.thesisType, 1.0);
    if (!itemMeta.title && itemMeta.attachmentNames && itemMeta.attachmentNames.length > 0) {
      addWeightedTokens(itemVec, itemMeta.attachmentNames.join(" "), 2.5);
    }
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
        let nextNum = getNextRootAxisNumber(targetTree);
        return {
          engineUsed: "offline",
          selectedKeys: [],
          proposedNew: seedMatches.map((m) => ({
            parentKey: "__ROOT__",
            name: formatNumberedAxisName(m.seed.name, nextNum++),
          })),
          reason: `Modo offline (pasta destino vazia): novo eixo sugerido a partir de termos como "${terms}".`,
          suggestNewHint: true,
          scores: [],
        };
      }
      const firstCleanTag = (itemMeta.tags || []).find((t) => String(t).trim().length >= 3);
      const fallbackRaw = firstCleanTag ? String(firstCleanTag).trim() : "Geral e Outros Temas";
      const fallbackName = formatNumberedAxisName(fallbackRaw, getNextRootAxisNumber(targetTree));
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
      let nextNum = getNextRootAxisNumber(targetTree);
      for (const m of seedMatches) {
        const existing = findExistingLeafByName(leaves, m.seed.name);
        if (existing) {
          if (!selected.some((s) => s.key === existing.key)) {
            selected.push({ key: existing.key, name: existing.name, matchedTerms: m.matchedTerms });
          }
        } else {
          proposedNew.push({ parentKey: "__ROOT__", name: formatNumberedAxisName(m.seed.name, nextNum++) });
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
          const numberedFallback = formatNumberedAxisName("Geral e Outros Temas", nextNum++);
          proposedNew.push({ parentKey: "__ROOT__", name: numberedFallback });
          reason = `Modo offline: sem correspondência forte — sugerindo pasta "${numberedFallback}".`;
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

  function compactParentMeta(itemMeta) {
    const out = {
      title: itemMeta.title,
      itemType: itemMeta.itemType,
    };
    if (itemMeta.creators && itemMeta.creators.length > 0) out.creators = itemMeta.creators.slice(0, 4);
    if (itemMeta.year) out.year = itemMeta.year;
    if (itemMeta.publicationTitle) out.publicationTitle = itemMeta.publicationTitle;
    if (itemMeta.publisher) out.publisher = itemMeta.publisher;
    if (itemMeta.place) out.place = itemMeta.place;
    if (itemMeta.series) out.series = itemMeta.series;
    if (itemMeta.thesisType) out.thesisType = itemMeta.thesisType;
    if (itemMeta.DOI) out.DOI = itemMeta.DOI;
    if (itemMeta.ISBN) out.ISBN = itemMeta.ISBN;
    if (itemMeta.ISSN) out.ISSN = itemMeta.ISSN;
    if (itemMeta.url) out.url = itemMeta.url;
    if (itemMeta.language) out.language = itemMeta.language;
    if (itemMeta.tags && itemMeta.tags.length > 0) out.tags = itemMeta.tags.slice(0, 10);
    if (itemMeta.abstractNote) out.abstractNote = itemMeta.abstractNote.slice(0, 700);
    if (itemMeta.extra) out.extra = itemMeta.extra.slice(0, 180);
    if (itemMeta.attachmentNames && itemMeta.attachmentNames.length > 0) {
      out.files = itemMeta.attachmentNames.slice(0, 2);
    }
    return out;
  }

  function buildPrompt(itemMeta, targetTree, settings, offlineAnalysis) {
    const treeSummary = (targetTree.eixos || []).map((eixo) => {
      if (eixo.isLeaf && eixo.leaf) {
        return {
          key: eixo.key,
          name: eixo.name,
          samples: (eixo.leaf.sampleTitles || []).slice(0, 4),
        };
      }
      return {
        eixoKey: eixo.key,
        eixoName: eixo.name,
        subtemas: (eixo.children || []).map((ch) => ({
          key: ch.key,
          name: ch.name,
          samples: (ch.sampleTitles || []).slice(0, 3),
        })),
      };
    });

    const maxTargets = settings.maxTargets || 3;
    const allowNew = Boolean(settings.allowCreateNew);

    const kwSummary = offlineAnalysis
      ? {
          suggested_keys: offlineAnalysis.selectedKeys || [],
          proposed_new: (offlineAnalysis.proposedNew || []).map((n) => n.name),
          top_keyword_scores: (offlineAnalysis.scores || []).slice(0, 4).map((s) => ({
            key: s.key,
            name: s.name,
            score: Number((s.score || 0).toFixed(3)),
            terms: s.matchedTerms || [],
          })),
        }
      : null;

    return (
      `Você é um bibliotecário e historiador especialista organizando uma biblioteca acadêmica no Zotero.\n` +
      `Classifique o item abaixo em 1 até ${maxTargets} subcoleções temáticas.\n\n` +
      `INSTRUÇÕES DE ACURÁCIA (CRUZAMENTO IA + PALAVRAS-CHAVE + METADADOS DO ITEM PAI):\n` +
      `1. Considere TODOS os metadados do item pai (título, autores, ano, editora, coleção/série, DOI, ISBN, revista, resumo, tags) e seu conhecimento bibliográfico sobre a obra/autor.\n` +
      `2. Compare sua análise semântica com a ANALISE_POR_PALAVRAS_CHAVE fornecida abaixo: confirme quando concordarem, corrija falsos positivos de palavras-chave e combine eixos complementares em obras interdisciplinares.\n` +
      `3. Use EXATAMENTE as chaves ("key") listadas em ESTRUTURA.\n` +
      `4. ${
        allowNew
          ? `Se o item tratar de tema realmente novo que não se encaixe bem nas pastas existentes, proponha no máximo 1 nova subcoleção em "new_subcollections" (com "parent_key" de um eixo existente ou "__ROOT__"). Use numeração no padrão "01 - Nome do Eixo" para novos eixos na raiz (ou "N.M Nome do Subtema" dentro de um eixo numerado).`
          : `NÃO proponha novas subcoleções ("new_subcollections": []).`
      }\n` +
      `5. Responda EXCLUSIVAMENTE com JSON válido:\n` +
      `{"selected_keys":["KEY1"],"new_subcollections":[{"parent_key":"__ROOT__","name":"Nome"}],"reason":"Justificativa curta (1 frase) mencionando o cruzamento IA + palavras-chave."}\n\n` +
      `ESTRUTURA:${JSON.stringify(treeSummary)}\n` +
      `ANALISE_POR_PALAVRAS_CHAVE:${JSON.stringify(kwSummary)}\n` +
      `ITEM_PAI:${JSON.stringify(compactParentMeta(itemMeta))}`
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

  function buildGeminiThinkingConfig(model) {
    const m = String(model || "").toLowerCase();
    if (/gemini-(3|4)/.test(m)) {
      return { thinkingLevel: "low" };
    }
    if (/gemini-2\.5-flash/.test(m)) {
      return { thinkingBudget: 0 };
    }
    return null;
  }

  function sleepMs(ms) {
    if (typeof Zotero !== "undefined" && Zotero.Promise && typeof Zotero.Promise.delay === "function") {
      return Zotero.Promise.delay(ms);
    }
    if (typeof setTimeout === "function") {
      return new Promise((r) => setTimeout(r, ms));
    }
    return Promise.resolve();
  }

  async function requestWithRetry(method, url, options, maxAttempts) {
    const attempts = Math.max(1, maxAttempts || 2);
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await Zotero.HTTP.request(method, url, options);
      } catch (err) {
        lastErr = err;
        const status = err && (err.status || (err.xmlhttp && err.xmlhttp.status));
        const isTransient = !status || status === 429 || status >= 500;
        if (!isTransient || i === attempts - 1) {
          throw err;
        }
        await sleepMs(900 * (i + 1));
      }
    }
    throw lastErr;
  }

  async function callGemini(prompt, settings, timeoutMs) {
    const apiKey = settings.aiApiKey;
    if (!apiKey) throw new Error("Chave de API do Gemini não configurada.");
    const model = settings.aiModel || "gemini-3.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const makeBody = (includeThinking) => {
      const genConfig = {
        temperature: 0.15,
        responseMimeType: "application/json",
      };
      if (includeThinking) {
        const tc = buildGeminiThinkingConfig(model);
        if (tc) genConfig.thinkingConfig = tc;
      }
      return JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: genConfig,
      });
    };

    let resp;
    const hasTc = Boolean(buildGeminiThinkingConfig(model));
    try {
      resp = await requestWithRetry(
        "POST",
        url,
        {
          headers: { "Content-Type": "application/json" },
          body: makeBody(hasTc),
          timeout: timeoutMs || 35000,
        },
        2
      );
    } catch (err) {
      const status = err && (err.status || (err.xmlhttp && err.xmlhttp.status));
      if (hasTc && status === 400) {
        // Fallback cleanly if this specific model variant does not support thinkingConfig
        resp = await requestWithRetry(
          "POST",
          url,
          {
            headers: { "Content-Type": "application/json" },
            body: makeBody(false),
            timeout: timeoutMs || 35000,
          },
          2
        );
      } else {
        throw err;
      }
    }

    const data = JSON.parse(resp.responseText);
    const parts =
      (data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts) ||
      [];
    // Ignore internal thought parts so JSON extraction only reads the actual answer
    const answerParts = parts.filter((p) => p && !p.thought && typeof p.text === "string");
    const effectiveParts = answerParts.length > 0 ? answerParts : parts;
    const text = effectiveParts.map((p) => p.text || "").join("\n");
    return extractJsonFromText(text);
  }

  async function callOpenAICompatible(prompt, settings, isCustom, timeoutMs) {
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
      temperature: 0.15,
      messages: [
        {
          role: "system",
          content: "Responda sempre apenas com JSON válido conforme o esquema solicitado.",
        },
        { role: "user", content: prompt },
      ],
    };

    const resp = await requestWithRetry(
      "POST",
      endpoint,
      {
        headers,
        body: JSON.stringify(payload),
        timeout: timeoutMs || 40000,
      },
      2
    );
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
    // Always run fast keyword/TF-IDF analysis first so the AI can cross-check against it
    const offlineAnalysis = classifyOffline(itemMeta, targetTree, settings);
    const prompt = buildPrompt(itemMeta, targetTree, settings, offlineAnalysis);
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
      let nextRootNum = getNextRootAxisNumber(targetTree);
      const eixoByKey = new Map((targetTree.eixos || []).map((e) => [e.key, e]));
      let subOffset = 0;
      for (const ns of parsed.new_subcollections) {
        if (!ns || !ns.name || !String(ns.name).trim()) continue;
        const pKey =
          ns.parent_key && validEixoKeys.has(ns.parent_key) ? ns.parent_key : "__ROOT__";
        const formattedName =
          pKey === "__ROOT__"
            ? formatNumberedAxisName(ns.name, nextRootNum++)
            : formatNumberedSubtemaName(ns.name, eixoByKey.get(pKey), subOffset++);
        proposedNew.push({
          parentKey: pKey,
          name: formattedName,
        });
      }
    }

    // Reconcile if AI returned empty selection despite valid offline keyword match
    if (selectedKeys.length === 0 && proposedNew.length === 0) {
      for (const k of offlineAnalysis.selectedKeys || []) {
        if (validLeafKeys.has(k) && !selectedKeys.includes(k)) {
          selectedKeys.push(k);
        }
      }
      if (selectedKeys.length === 0 && settings.allowCreateNew) {
        for (const ns of offlineAnalysis.proposedNew || []) {
          proposedNew.push(ns);
        }
      }
    }

    return {
      engineUsed: `ai:${settings.aiProvider}`,
      selectedKeys: selectedKeys.slice(0, settings.maxTargets || 3),
      proposedNew: proposedNew.slice(0, 2),
      reason: String(parsed.reason || "Classificado via cruzamento IA + palavras-chave.").trim(),
      suggestNewHint: proposedNew.length > 0,
      scores: offlineAnalysis.scores || [],
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
  function mergeManualAxesIntoVirtualTree(targetTree, customAxes) {
    const baseTree = targetTree || {
      root: { id: 0, key: "__NEW__", name: "Por Eixo e Tema" },
      eixos: [],
      leaves: [],
    };
    const manualList = Array.isArray(customAxes)
      ? customAxes.map((s) => String(s || "").trim()).filter(Boolean)
      : [];
    if (manualList.length === 0) return { tree: baseTree, manualKeySet: new Set() };

    const clonedLeaves = (baseTree.leaves || []).slice();
    const clonedEixos = (baseTree.eixos || []).slice();
    const manualKeySet = new Set();

    const norm = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    for (let i = 0; i < manualList.length; i++) {
      const name = manualList[i];
      if (clonedLeaves.some((l) => norm(l.name) === norm(name))) continue;
      const vKey = `__MANUAL_${i}__`;
      manualKeySet.add(vKey);
      const leaf = {
        id: -1 - i,
        key: vKey,
        name,
        parentKey: null,
        parentName: null,
        fullLabel: name,
        itemCount: 0,
        sampleTitles: [],
        sampleTags: [],
        isManual: true,
      };
      clonedLeaves.push(leaf);
      clonedEixos.push({
        id: -1 - i,
        key: vKey,
        name,
        isLeaf: true,
        leaf,
        children: [],
      });
    }
    return {
      tree: Object.assign({}, baseTree, { eixos: clonedEixos, leaves: clonedLeaves }),
      manualKeySet,
    };
  }

  function buildBatchPlanOffline(itemsMeta, targetTree, settings, customAxes) {
    const { tree: safeTree, manualKeySet } = mergeManualAxesIntoVirtualTree(targetTree, customAxes);
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
      if (manualKeySet.has(l.key)) {
        const keyNorm = l.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        ensureGroup(`new:__ROOT__:${keyNorm}`, {
          id: `new:__ROOT__:${keyNorm}`,
          isNew: true,
          isManual: true,
          existingKey: null,
          parentKey: "__ROOT__",
          parentName: null,
          name: l.name,
        });
      }
    }

    for (const item of itemsMeta) {
      const res = classifyOffline(item, safeTree, effectiveSettings);
      let assignedAny = false;

      for (const k of res.selectedKeys || []) {
        const leaf = leafByKey.get(k);
        if (!leaf) continue;
        if (manualKeySet.has(k)) {
          const keyNorm = leaf.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          const gid = `new:__ROOT__:${keyNorm}`;
          const g = ensureGroup(gid, {
            id: gid,
            isNew: true,
            isManual: true,
            existingKey: null,
            parentKey: "__ROOT__",
            parentName: null,
            name: leaf.name,
          });
          if (!g._seenIds.has(item.id)) {
            g._seenIds.add(item.id);
            g.items.push(item);
          }
          assignedAny = true;
          continue;
        }
        const g = ensureGroup(`existing:${k}`, {
          id: `existing:${k}`,
          isNew: false,
          isManual: false,
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
        const baseName = stripNumericPrefix(ns.name) || String(ns.name).trim();
        const keyNorm = baseName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const gid = `new:${ns.parentKey || "__ROOT__"}:${keyNorm}`;
        const g = ensureGroup(gid, {
          id: gid,
          isNew: true,
          isManual: false,
          existingKey: null,
          parentKey: ns.parentKey || "__ROOT__",
          parentName: null,
          name: baseName,
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

    const groups = applyNumberingToNewGroups(
      Array.from(groupsMap.values())
        .map((g) => {
          delete g._seenIds;
          return g;
        })
        .sort((a, b) => {
          if (Boolean(a.isManual) !== Boolean(b.isManual)) return a.isManual ? -1 : 1;
          if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
          return b.items.length - a.items.length;
        }),
      targetTree
    );

    const newCount = groups.filter((g) => g.isNew).length;
    const existCount = groups.length - newCount;
    const reason =
      existCount > 0
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

  async function buildBatchPlanWithAI(itemsMeta, targetTree, settings, customAxes) {
    const safeTree = targetTree || {
      root: { id: 0, key: "__NEW__", name: "Por Eixo e Tema" },
      eixos: [],
      leaves: [],
    };
    const manualList = Array.isArray(customAxes)
      ? customAxes.map((s) => String(s || "").trim()).filter(Boolean)
      : [];

    // 1. Run fast offline keyword plan FIRST for cross-checking!
    const offlinePlan = buildBatchPlanOffline(itemsMeta, targetTree, settings, manualList);
    const offlineHintsByItem = new Map();
    for (const grp of offlinePlan.groups || []) {
      for (const it of grp.items || []) {
        if (!offlineHintsByItem.has(it.id)) offlineHintsByItem.set(it.id, []);
        offlineHintsByItem.get(it.id).push(grp.name);
      }
    }

    const existingLeaves = (safeTree.leaves || []).map((l) => ({
      key: l.key,
      name: l.name,
      parent: l.parentName || null,
    }));

    const maxTargets = settings.maxTargets || 3;
    const allowNew = settings.allowCreateNew !== false;

    const compactItems = itemsMeta.map((it) => {
      const obj = {
        id: it.id,
        title: it.title,
      };
      if (it.creators && it.creators.length > 0) obj.authors = it.creators.slice(0, 2);
      if (it.year) obj.year = it.year;
      if (it.publisher) obj.pub = it.publisher;
      if (it.publicationTitle) obj.journal = it.publicationTitle;
      if (it.series) obj.series = it.series;
      if (it.DOI) obj.DOI = it.DOI;
      if (it.ISBN) obj.ISBN = it.ISBN;
      if (it.tags && it.tags.length > 0) obj.tags = it.tags.slice(0, 5);
      const kwHints = offlineHintsByItem.get(it.id);
      if (kwHints && kwHints.length > 0) obj.kw_hint = kwHints.slice(0, 2);
      return obj;
    });

    const chunkSize = 65;
    const chunks = [];
    for (let offset = 0; offset < compactItems.length; offset += chunkSize) {
      chunks.push(compactItems.slice(offset, offset + chunkSize));
    }

    const offlineAxesSummary = (offlinePlan.groups || []).map((g) => g.name);

    const runChunk = async (chunk, sharedNewAxes) => {
      const prompt =
        `Você é um bibliotecário e historiador especialista organizando uma coleção no Zotero.\n` +
        `Classifique TODOS os ${chunk.length} itens abaixo (1 até ${maxTargets} eixos por item) cruzando:\n` +
        `(a) os metadados completos do item pai (título, autores, editora, revista, série, DOI, ISBN, tags) + seu conhecimento bibliográfico da obra;\n` +
        `(b) o campo "kw_hint" gerado pela análise local por palavras-chave — confirme quando concordar e corrija quando a palavra-chave induzir erro.\n\n` +
        `REGRAS:\n` +
        `1. ${
          existingLeaves.length > 0
            ? `Priorize usar as pastas EXISTENTES (informando "existing_key").`
            : `Pasta destino vazia — crie entre 4 e 10 eixos temáticos coerentes em português.`
        }\n` +
        (manualList.length > 0
          ? `2. O usuário definiu manualmente estes índices (USE-OS com os nomes exatos quando aplicável): ${JSON.stringify(manualList)}.\n`
          : "") +
        `3. ${
          allowNew
            ? `Pode propor novos eixos ("existing_key": null, "name": "01 - Nome do Eixo" em PT-BR, sempre começando com numeração "01 - ", "02 - ", etc.), reutilizando nomes já sugeridos quando couber.`
            : `NÃO proponha novos eixos; use apenas "existing_key".`
        }\n` +
        `4. Responda EXCLUSIVAMENTE com JSON válido:\n` +
        `{"axes":[{"existing_key":null,"name":"Nome do Eixo","item_ids":[1,2]}],"summary":"Resumo curto."}\n\n` +
        `PASTAS_EXISTENTES:${JSON.stringify(existingLeaves)}\n` +
        `EIXOS_PALAVRAS_CHAVE:${JSON.stringify(sharedNewAxes.length > 0 ? sharedNewAxes : offlineAxesSummary)}\n` +
        `ITENS:${JSON.stringify(chunk)}`;

      if (settings.aiProvider === "gemini") {
        return callGemini(prompt, settings, 45000);
      }
      if (settings.aiProvider === "openai") {
        return callOpenAICompatible(prompt, settings, false, 45000);
      }
      return callOpenAICompatible(prompt, settings, true, 50000);
    };

    const groupsMap = new Map();
    const itemById = new Map(itemsMeta.map((it) => [it.id, it]));
    const leafByKey = new Map((safeTree.leaves || []).map((l) => [l.key, l]));
    const assignedIds = new Set();

    const normKey = (s) =>
      stripNumericPrefix(s)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const manualNormSet = new Set(manualList.map(normKey));
    // Pre-register manual axes so they are always preserved even if 0 items match
    for (const mName of manualList) {
      const gid = `new:__ROOT__:${normKey(mName)}`;
      if (!groupsMap.has(gid)) {
        groupsMap.set(gid, {
          id: gid,
          isNew: true,
          isManual: true,
          existingKey: null,
          parentKey: "__ROOT__",
          parentName: null,
          name: mName,
          enabled: true,
          items: [],
          _seen: new Set(),
        });
      }
    }

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

    function absorbParsed(parsed) {
      for (const ax of Array.isArray(parsed && parsed.axes) ? parsed.axes : []) {
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
                isManual: false,
                existingKey: validLeaf.key,
                parentKey: validLeaf.parentKey || "__ROOT__",
                parentName: validLeaf.parentName || null,
                name: validLeaf.name,
              },
              item
            );
          } else if (allowNew && ax.name && String(ax.name).trim()) {
            const cleanName = String(ax.name).trim();
            const n = normKey(cleanName);
            addToGroup(
              `new:__ROOT__:${n}`,
              {
                id: `new:__ROOT__:${n}`,
                isNew: true,
                isManual: manualNormSet.has(n),
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

    // Run chunk 1 first to establish unified axis names, then remaining chunks in parallel (batches of 2) for speed!
    if (chunks.length > 0) {
      const firstParsed = await runChunk(chunks[0], manualList);
      absorbParsed(firstParsed);

      const establishedAxes = Array.from(groupsMap.values())
        .filter((g) => g.isNew)
        .map((g) => g.name);

      for (let i = 1; i < chunks.length; i += 2) {
        const pair = chunks.slice(i, i + 2);
        const results = await Promise.all(pair.map((ch) => runChunk(ch, establishedAxes)));
        for (const r of results) absorbParsed(r);
      }
    }

    // Reconcile any item omitted by AI using the offline keyword cross-check so 0 items get silently dropped
    let reconciledFromOffline = 0;
    for (const grp of offlinePlan.groups || []) {
      for (const it of grp.items || []) {
        if (assignedIds.has(it.id)) continue;
        reconciledFromOffline++;
        if (!grp.isNew && grp.existingKey && leafByKey.has(grp.existingKey)) {
          const leaf = leafByKey.get(grp.existingKey);
          addToGroup(
            `existing:${leaf.key}`,
            {
              id: `existing:${leaf.key}`,
              isNew: false,
              isManual: false,
              existingKey: leaf.key,
              parentKey: leaf.parentKey || "__ROOT__",
              parentName: leaf.parentName || null,
              name: leaf.name,
            },
            it
          );
        } else if (allowNew) {
          const n = normKey(grp.name);
          addToGroup(
            `new:__ROOT__:${n}`,
            {
              id: `new:__ROOT__:${n}`,
              isNew: true,
              isManual: manualNormSet.has(n),
              existingKey: null,
              parentKey: "__ROOT__",
              parentName: null,
              name: grp.name,
            },
            it
          );
        }
      }
    }

    const unassigned = itemsMeta.filter((it) => !assignedIds.has(it.id));
    const groups = applyNumberingToNewGroups(
      Array.from(groupsMap.values())
        .map((g) => {
          delete g._seen;
          return g;
        })
        .sort((a, b) => {
          if (Boolean(a.isManual) !== Boolean(b.isManual)) return a.isManual ? -1 : 1;
          return b.items.length - a.items.length;
        }),
      targetTree
    );

    const extraNote =
      reconciledFromOffline > 0
        ? ` (+ ${reconciledFromOffline} completado(s) via palavras-chave)`
        : "";
    return {
      engineUsed: `ai:${settings.aiProvider}`,
      reason: `Cruzamento IA (${settings.aiProvider}) + palavras-chave: ${groups.length} eixo(s) para ${itemsMeta.length} item(ns)${extraNote}.`,
      groups,
      unassigned,
    };
  }

  async function buildBatchPlan(itemsMeta, targetTree, settings, forceEngine, customAxes) {
    const engine = forceEngine || settings.engine || "hybrid";
    if (engine === "offline") {
      return buildBatchPlanOffline(itemsMeta, targetTree, settings, customAxes);
    }
    if (engine === "ai" || (engine === "hybrid" && hasAIConfigured(settings))) {
      try {
        return await buildBatchPlanWithAI(itemsMeta, targetTree, settings, customAxes);
      } catch (err) {
        Zotero.debug("EixosClassifier.buildBatchPlan AI error: " + err);
        if (engine === "ai") throw err;
        const fallback = buildBatchPlanOffline(itemsMeta, targetTree, settings, customAxes);
        fallback.reason = `Fallback offline (IA indisponível: ${err.message || err}). ${fallback.reason}`;
        return fallback;
      }
    }
    const offline = buildBatchPlanOffline(itemsMeta, targetTree, settings, customAxes);
    if (engine === "hybrid" && !hasAIConfigured(settings)) {
      offline.reason = `Modo offline ativo (configure uma chave de IA para cruzamento semântico + palavras-chave). ${offline.reason}`;
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

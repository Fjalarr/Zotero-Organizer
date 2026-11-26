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

  function getActiveLocale(settings) {
    if (typeof EixosI18n !== "undefined") {
      return EixosI18n.getLocale(settings && settings.language);
    }
    return "en-US";
  }

  function tr(key, params, settings) {
    if (typeof EixosI18n !== "undefined") {
      return EixosI18n.t(key, params, settings && settings.language);
    }
    return key;
  }

  const OFFLINE_TOPIC_SEEDS = [
    {
      name: "Teoria da História e Historiografia",
      nameEn: "Theory of History & Historiography",
      keywords: [
        "historiografia", "historiography", "historiografico", "historicidade", "historicity",
        "teoria", "koselleck", "hartog", "ricoeur", "benjamin", "bloch", "braudel", "white",
        "conceitos", "conceptual", "temporalidade", "temporality", "presentismo", "anacronismo",
        "metodologia", "methodology", "arquivos", "archive", "documento", "monumento", "fontes",
        "narrativa", "epistemologia", "tempo", "passado", "passados", "historical",
      ],
      subthemes: [
        {
          name: "Temporalidade, Historicidade e História dos Conceitos",
          nameEn: "Temporality, Historicity & Conceptual History",
          keywords: ["koselleck", "hartog", "temporalidade", "temporality", "historicidade", "historicity", "presentismo", "anacronismo", "conceitos", "conceptual", "tempo", "passado", "passados", "futuro", "benjamin"],
        },
        {
          name: "Narrativa, Epistemologia e Escrita da História",
          nameEn: "Narrative, Epistemology & Historical Writing",
          keywords: ["ricoeur", "white", "narrativa", "narrative", "epistemologia", "epistemology", "historiografia", "historiography", "historiografico", "escrita", "writing", "teoria", "theory"],
        },
        {
          name: "Arquivos, Fontes e Metodologia Histórica",
          nameEn: "Archives, Primary Sources & Historical Methodology",
          keywords: ["arquivos", "archive", "archives", "documento", "document", "monumento", "fontes", "sources", "metodologia", "methodology", "bloch", "braudel", "oral", "micro-historia"],
        },
      ],
    },
    {
      name: "Teoria Social, Filosofia Política e Capitalismo",
      nameEn: "Social Theory, Political Philosophy & Capitalism",
      keywords: [
        "marx", "marxismo", "marxism", "marxist", "gramsci", "capital", "capitalismo", "capitalism",
        "capitalista", "economia", "economy", "economic", "politica", "political", "soberania",
        "sovereignty", "estado", "state", "fascismo", "fascism", "neofascismo", "populismo",
        "populism", "hegemonia", "hegemony", "ideologia", "ideology", "classe", "class",
        "neoliberalismo", "neoliberalism", "liberalismo", "liberalism", "democracia", "democracy",
        "biopoder", "necropolitica", "sociologia", "sociology", "filosofia", "philosophy",
        "trabalho", "labor", "labour", "acumulacao", "reproducao", "burguesia", "proletariado",
      ],
      subthemes: [
        {
          name: "Marxismo, Capitalismo e Economia Política",
          nameEn: "Marxism, Capitalism & Political Economy",
          keywords: ["marx", "marxismo", "marxism", "marxist", "capital", "capitalismo", "capitalism", "capitalista", "economia", "economy", "economic", "trabalho", "labor", "labour", "acumulacao", "classe", "class", "proletariado", "burguesia", "neoliberalismo", "neoliberalism"],
        },
        {
          name: "Estado, Democracia, Fascismo e Poder",
          nameEn: "State, Democracy, Fascism & Power",
          keywords: ["estado", "state", "soberania", "sovereignty", "fascismo", "fascism", "neofascismo", "populismo", "populism", "democracia", "democracy", "biopoder", "necropolitica", "autoritarismo", "totalitarismo", "arendt", "foucault"],
        },
        {
          name: "Hegemonia, Ideologia e Filosofia Social",
          nameEn: "Hegemony, Ideology & Social Philosophy",
          keywords: ["gramsci", "hegemonia", "hegemony", "ideologia", "ideology", "sociologia", "sociology", "filosofia", "philosophy", "liberalismo", "liberalism", "teoria", "critica", "frankfurt", "habermas"],
        },
      ],
    },
    {
      name: "Estudos Pós-Coloniais, Colonialismo e Imperialismo",
      nameEn: "Postcolonial Studies, Colonialism & Imperialism",
      keywords: [
        "colonial", "colonialismo", "colonialism", "pos-colonial", "postcolonial", "post-colonial",
        "decolonial", "descolonial", "imperialismo", "imperialism", "imperio", "empire", "imperial",
        "subalterno", "subaltern", "orientalismo", "orientalism", "eurocentrismo", "eurocentrism",
        "metropole", "colonia", "colony", "settler", "povoamento", "terceiro", "global", "south",
        "sul", "anticolonial", "anti-colonial", "descolonizacao", "decolonization", "spivak",
        "said", "fanon", "mbembe", "chakrabarty", "prakash", "bhabha",
      ],
      subthemes: [
        {
          name: "Teoria Pós-Colonial, Subalternidade e Decolonialidade",
          nameEn: "Postcolonial Theory, Subalternity & Decoloniality",
          keywords: ["subalterno", "subaltern", "spivak", "said", "orientalismo", "orientalism", "bhabha", "chakrabarty", "prakash", "mbembe", "decolonial", "descolonial", "eurocentrismo", "eurocentrism", "pos-colonial", "postcolonial"],
        },
        {
          name: "Impérios, Imperialismo e Colonialismo de Povoamento",
          nameEn: "Empires, Imperialism & Settler Colonialism",
          keywords: ["imperialismo", "imperialism", "imperio", "empire", "imperial", "settler", "povoamento", "metropole", "colonia", "colony", "lenin", "capital", "expansion"],
        },
        {
          name: "Lutas Anticoloniais e Descolonização",
          nameEn: "Anticolonial Struggles & Decolonization",
          keywords: ["anticolonial", "anti-colonial", "descolonizacao", "decolonization", "fanon", "independencia", "independence", "resistencia", "resistance", "nacionalismo", "nationalism", "terceiro", "sul", "south"],
        },
      ],
    },
    {
      name: "Ásia Oriental, Japão e Coreia",
      nameEn: "East Asia, Japan & Korea",
      keywords: [
        "japao", "japan", "japanese", "japones", "japonesa", "coreia", "korea", "korean", "coreano",
        "coreana", "china", "chinese", "chines", "asia", "asian", "asiatico", "east", "manchuria",
        "manchukuo", "taiwan", "okinawa", "hiroshima", "nagasaki", "toquio", "tokyo", "seoul",
        "meiji", "showa", "pacifico", "pacific", "pan-asianism", "ienaga", "maruyama", "dower",
        "chosen", "joseon", "oriental", "nippon",
      ],
      subthemes: [
        {
          name: "Colonialismo Japonês, Império e Guerra do Pacífico",
          nameEn: "Japanese Colonialism, Empire & Pacific War",
          keywords: ["japao", "japan", "japanese", "japones", "meiji", "showa", "imperial", "empire", "settler", "manchuria", "manchukuo", "hiroshima", "nagasaki", "pacifico", "pacific", "tokyo", "toquio", "dower", "ienaga", "maruyama", "okinawa"],
        },
        {
          name: "História da Coreia, Resistência e Pós-Guerra",
          nameEn: "Korean History, Resistance & Postwar",
          keywords: ["coreia", "korea", "korean", "coreano", "coreana", "seoul", "seul", "chosen", "joseon", "peasant", "campones", "koch", "protest", "division", "korean war"],
        },
        {
          name: "China, Taiwan e Relações na Ásia Oriental",
          nameEn: "China, Taiwan & East Asian Relations",
          keywords: ["china", "chinese", "chines", "taiwan", "pan-asianism", "east", "asia", "asian", "asiatico", "mao", "beijing", "pequim", "cold war"],
        },
      ],
    },
    {
      name: "Memória, Trauma e Justiça de Transição",
      nameEn: "Memory, Trauma & Transitional Justice",
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
      subthemes: [
        {
          name: "Holocausto, Genocídio e Testemunho",
          nameEn: "Holocaust, Genocide & Testimony",
          keywords: ["holocausto", "holocaust", "shoah", "auschwitz", "genocidio", "genocide", "eichmann", "testemunho", "testimony", "witness", "witnesses", "testify", "vitimas", "victims", "atrocidades", "atrocities", "responsabilidade"],
        },
        {
          name: "Justiça de Transição, Tribunais e Reparações",
          nameEn: "Transitional Justice, Tribunals & Reparations",
          keywords: ["justica", "justice", "transicao", "transitional", "tribunal", "tribunals", "court", "crimes", "reparacao", "reparacoes", "reparation", "reparations", "comissao", "verdade", "truth", "anistia", "nuremberg", "hague", "haia", "impunidade", "sierra", "leone"],
        },
        {
          name: "Políticas da Memória, Trauma e Ditaduras",
          nameEn: "Politics of Memory, Trauma & Dictatorships",
          keywords: ["memoria", "memory", "memories", "trauma", "traumatic", "esquecimento", "forgetting", "luto", "silencio", "silence", "ditadura", "dictatorship", "perlaboracao", "monumento", "comemoracao"],
        },
      ],
    },
    {
      name: "Gênero, Feminismo e Violência Sexual",
      nameEn: "Gender, Feminism & Sexual Violence",
      keywords: [
        "genero", "gender", "mulher", "mulheres", "woman", "women", "feminismo", "feminism",
        "feminista", "feminist", "sexual", "sexualidade", "sexuality", "estupro", "rape",
        "conforto", "comfort", "wianbu", "ianfu", "prostitution", "prostituicao", "escravidao",
        "slavery", "interseccionalidade", "intersectionality", "patriarcado", "patriarchy",
        "maternidade", "maternal", "maes", "corpo", "body", "violencia", "violence", "shame",
        "vergonha", "masculinidade", "feminino", "queer", "hooks", "butler", "federici",
      ],
      subthemes: [
        {
          name: "Teoria Feminista, Gênero e Interseccionalidade",
          nameEn: "Feminist Theory, Gender & Intersectionality",
          keywords: ["feminismo", "feminism", "feminista", "feminist", "interseccionalidade", "intersectionality", "patriarcado", "patriarchy", "butler", "hooks", "federici", "queer", "masculinidade", "teoria", "genero", "gender"],
        },
        {
          name: "Violência Sexual em Conflitos e \"Comfort Women\"",
          nameEn: "Sexual Violence in Conflicts & \"Comfort Women\"",
          keywords: ["conforto", "comfort", "wianbu", "ianfu", "estupro", "rape", "violencia", "violence", "prostitution", "prostituicao", "escravidao", "slavery", "slaves", "guerra", "war", "shame", "vergonha", "military", "militar"],
        },
        {
          name: "Corpo, Sexualidade e Maternidade",
          nameEn: "Body, Sexuality & Motherhood",
          keywords: ["corpo", "body", "sexualidade", "sexuality", "maternidade", "maternal", "maes", "reproducao", "reproduction", "feminino", "saude", "aborto"],
        },
      ],
    },
    {
      name: "Escravidão, Raça e Mundo Atlântico",
      nameEn: "Slavery, Race & Atlantic World",
      keywords: [
        "escravidao", "slavery", "escravo", "escravos", "slave", "slaves", "abolição", "abolicao",
        "abolition", "alforria", "atlantico", "atlantic", "raca", "race", "racial", "racismo",
        "racism", "negro", "negros", "black", "africa", "african", "africano", "afro", "casta",
        "caste", "diaspora", "plantation", "trafico", "marquese", "hartman", "gilroy",
      ],
      subthemes: [
        {
          name: "Escravidão, Tráfico Atlântico e Abolição",
          nameEn: "Slavery, Atlantic Trade & Abolition",
          keywords: ["escravidao", "slavery", "escravo", "slave", "slaves", "abolicao", "abolition", "alforria", "trafico", "plantation", "atlantico", "atlantic", "marquese"],
        },
        {
          name: "Raça, Racismo e Diáspora Africana",
          nameEn: "Race, Racism & African Diaspora",
          keywords: ["raca", "race", "racial", "racismo", "racism", "negro", "black", "africa", "african", "afro", "diaspora", "hartman", "gilroy", "casta", "caste"],
        },
      ],
    },
    {
      name: "História do Brasil e da América Latina",
      nameEn: "History of Brazil & Latin America",
      keywords: [
        "brasil", "brazil", "brazilian", "brasileiro", "brasileira", "america", "latina", "latin",
        "ibero", "ibero-americano", "rio", "janeiro", "paulo", "bahia", "minas", "nordeste",
        "argentina", "mexico", "chile", "cuba", "peru", "colombia", "uruguai", "paraguai",
        "vargas", "republica", "imperio", "independencia", "cnv", "indigena", "indigenas",
        "sertão", "sertao", "amazonia", "pernambuco", "fluminense",
      ],
      subthemes: [
        {
          name: "Brasil Colonial e Imperial",
          nameEn: "Colonial & Imperial Brazil",
          keywords: ["imperio", "independencia", "bahia", "minas", "pernambuco", "sertao", "indigena", "indigenas", "colonial", "escravidao"],
        },
        {
          name: "Brasil Republicano, Vargas e Ditadura",
          nameEn: "Republican Brazil, Vargas & Dictatorship",
          keywords: ["republica", "vargas", "cnv", "ditadura", "rio", "janeiro", "paulo", "nordeste", "amazonia", "fluminense", "brasil", "brazil"],
        },
        {
          name: "América Latina e Estudos Ibero-Americanos",
          nameEn: "Latin America & Ibero-American Studies",
          keywords: ["america", "latina", "latin", "ibero", "argentina", "mexico", "chile", "cuba", "peru", "colombia", "uruguai", "paraguai"],
        },
      ],
    },
    {
      name: "Cultura, Cinema, Literatura e Artes",
      nameEn: "Culture, Cinema, Literature & Arts",
      keywords: [
        "cultura", "culture", "cultural", "cinema", "film", "filme", "filmes", "imagem", "imagens",
        "image", "images", "estetica", "aesthetics", "arte", "artes", "art", "literatura",
        "literature", "literario", "romance", "poesia", "musica", "music", "teatro", "midia",
        "media", "imprensa", "jornalismo", "costumes", "mentalidades", "imaginario", "simbolo",
        "fotografia", "photography", "visual", "religiao", "religion", "sagrado", "demonios",
        "demons", "bruxaria", "romaria", "sincretismo",
      ],
      subthemes: [
        {
          name: "Cinema, Fotografia e Cultura Visual",
          nameEn: "Cinema, Photography & Visual Culture",
          keywords: ["cinema", "film", "filme", "filmes", "imagem", "imagens", "image", "images", "fotografia", "photography", "visual", "midia", "media"],
        },
        {
          name: "Literatura, Estética, Artes e Música",
          nameEn: "Literature, Aesthetics, Arts & Music",
          keywords: ["literatura", "literature", "literario", "romance", "poesia", "estetica", "aesthetics", "arte", "artes", "art", "musica", "music", "teatro", "imprensa", "jornalismo"],
        },
        {
          name: "Religião, Mentalidades e Imaginário Cultural",
          nameEn: "Religion, Mentalities & Cultural Imaginary",
          keywords: ["religiao", "religion", "sagrado", "demonios", "demons", "bruxaria", "romaria", "sincretismo", "costumes", "mentalidades", "imaginario", "simbolo"],
        },
      ],
    },
    {
      name: "Educação, Ensino de História e Pedagogia",
      nameEn: "Education, History Teaching & Pedagogy",
      keywords: [
        "educacao", "education", "educational", "ensino", "teaching", "didatica", "didactics",
        "pedagogia", "pedagogy", "escola", "school", "escolar", "curriculo", "curriculum",
        "livro", "didatico", "textbook", "textbooks", "professor", "professores", "docente",
        "docencia", "aprendizagem", "learning", "saber", "universidade", "freire", "charlot",
      ],
      subthemes: [
        {
          name: "Ensino de História, Currículo e Livros Didáticos",
          nameEn: "History Teaching, Curriculum & Textbooks",
          keywords: ["ensino", "teaching", "didatica", "didactics", "curriculo", "curriculum", "didatico", "textbook", "textbooks", "escola", "school", "escolar"],
        },
        {
          name: "Pedagogia, Formação Docente e Universidade",
          nameEn: "Pedagogy, Teacher Education & Higher Education",
          keywords: ["pedagogia", "pedagogy", "professor", "professores", "docente", "docencia", "aprendizagem", "learning", "universidade", "freire", "charlot", "educacao", "education"],
        },
      ],
    },
    {
      name: "Oriente Médio, Conflitos e História Global",
      nameEn: "Middle East, Conflicts & Global History",
      keywords: [
        "palestina", "palestine", "palestinian", "israel", "israeli", "nakba", "sionismo",
        "zionist", "oriente", "middle", "east", "arabe", "arab", "islam", "islamico",
        "medieval", "antiguidade", "europa", "europe", "european", "alemanha", "germany",
        "franca", "france", "italia", "italy", "russia", "soviet", "uniao", "estados", "unidos",
        "united", "states", "guerra", "fria", "cold", "war", "internacional", "international",
      ],
      subthemes: [
        {
          name: "Oriente Médio, Palestina e Israel",
          nameEn: "Middle East, Palestine & Israel",
          keywords: ["palestina", "palestine", "palestinian", "israel", "israeli", "nakba", "sionismo", "zionist", "oriente", "middle", "arabe", "arab", "islam", "islamico"],
        },
        {
          name: "História da Europa, Antiguidade e Medievo",
          nameEn: "European, Ancient & Medieval History",
          keywords: ["europa", "europe", "european", "alemanha", "germany", "franca", "france", "italia", "italy", "medieval", "antiguidade", "russia", "soviet"],
        },
        {
          name: "Guerra Fria e Relações Internacionais",
          nameEn: "Cold War & International Relations",
          keywords: ["guerra", "fria", "cold", "war", "internacional", "international", "estados", "unidos", "united", "states", "diplomacia"],
        },
      ],
    },
  ];

  function getSeedLocalizedName(seed, settings) {
    return getActiveLocale(settings) === "en-US" ? seed.nameEn || seed.name : seed.name;
  }

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
    const existingEixoByKey = new Map();
    for (const e of (targetTree && targetTree.eixos) || []) {
      existingEixoByKey.set(e.key, e);
      const m = String(e.name || "").trim().match(/^(\d{1,2})\s*[-–—]/);
      if (m) usedNums.add(parseInt(m[1], 10));
    }

    const groupById = new Map();
    for (const g of groups) {
      groupById.set(g.id, g);
    }

    // Pass 1: Number all Level-1 root axes sequentially (01 - ..., 02 - ...)
    for (const g of groups) {
      if (g.isSubtheme) continue;
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

    // Pass 2: Number all Level-2 subthemes continuously under their parent axis (1.1 ..., 1.2 ...)
    const subCountersByParent = new Map();
    for (const g of groups) {
      if (!g.isSubtheme) continue;
      const parentGrp = g.parentGroupId ? groupById.get(g.parentGroupId) : null;
      const existingParent = !parentGrp && g.parentKey ? existingEixoByKey.get(g.parentKey) : null;
      const parentName =
        (parentGrp && parentGrp.name) ||
        (existingParent && existingParent.name) ||
        g.parentName ||
        "";
      if (parentName) g.parentName = parentName;
      if (!g.isNew) continue;

      const parentIdKey = g.parentGroupId || g.parentKey || parentName || "__SUB__";
      if (!subCountersByParent.has(parentIdKey)) {
        let startSub = 0;
        if (existingParent && Array.isArray(existingParent.children)) {
          for (const ch of existingParent.children) {
            const cm = String(ch.name || "").trim().match(/^(\d{1,2})\.(\d{1,2})\b/);
            if (cm) startSub = Math.max(startSub, parseInt(cm[2], 10));
          }
          startSub = Math.max(startSub, existingParent.children.length);
        }
        subCountersByParent.set(parentIdKey, startSub);
      }

      const pm = String(parentName).trim().match(/^(\d{1,2})\s*[-–—]/);
      const nextSub = subCountersByParent.get(parentIdKey) + 1;
      subCountersByParent.set(parentIdKey, nextSub);
      const baseSub = stripNumericPrefix(g.name) || String(g.name || "").trim();
      g.name = pm ? `${parseInt(pm[1], 10)}.${nextSub} ${baseSub}` : `${nextSub}. ${baseSub}`;
    }

    // Order cleanly: Level-1 axes first (with their Level-2 subthemes grouped immediately below!)
    const childrenByParent = new Map();
    const roots = [];
    const orphanSubs = [];
    for (const g of groups) {
      if (g.isSubtheme && g.parentGroupId && groupById.has(g.parentGroupId)) {
        if (!childrenByParent.has(g.parentGroupId)) childrenByParent.set(g.parentGroupId, []);
        childrenByParent.get(g.parentGroupId).push(g);
      } else if (g.isSubtheme) {
        orphanSubs.push(g);
      } else {
        roots.push(g);
      }
    }

    const ordered = [];
    for (const r of roots) {
      ordered.push(r);
      const kids = childrenByParent.get(r.id) || [];
      for (const k of kids) ordered.push(k);
    }
    for (const o of orphanSubs) ordered.push(o);
    return ordered;
  }

  function findMatchingTopicSeed(axisName) {
    const norm = (s) =>
      stripNumericPrefix(s)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const target = norm(axisName);
    if (!target) return null;
    for (const seed of OFFLINE_TOPIC_SEEDS) {
      if (norm(seed.name) === target || norm(seed.nameEn) === target) {
        return seed;
      }
    }
    return null;
  }

  const MAX_SUBTHEMES_PER_AXIS = 3;

  /**
   * Ensures no Level-1 axis exceeds MAX_SUBTHEMES_PER_AXIS (3) automatic Level-2 subthemes.
   * If more than 3 non-manual subthemes exist under one axis, merges the tail into the 3rd bucket
   * (or a General/Other subtheme) so zero items are ever dropped.
   */
  function enforceMaxSubthemesPerAxis(groups, settings) {
    const subsByParent = new Map();
    for (const g of groups) {
      if (g.isSubtheme && g.parentGroupId && !g.isManual) {
        if (!subsByParent.has(g.parentGroupId)) subsByParent.set(g.parentGroupId, []);
        subsByParent.get(g.parentGroupId).push(g);
      }
    }

    const removedIds = new Set();
    for (const [parentId, subs] of subsByParent.entries()) {
      if (subs.length <= MAX_SUBTHEMES_PER_AXIS) continue;
      subs.sort((a, b) => b.items.length - a.items.length);
      const keep = subs.slice(0, MAX_SUBTHEMES_PER_AXIS - 1);
      const overflow = subs.slice(MAX_SUBTHEMES_PER_AXIS - 1);
      const target = overflow[0];
      const seen = new Set(target.items.map((it) => it.id));
      for (let i = 1; i < overflow.length; i++) {
        for (const it of overflow[i].items) {
          if (!seen.has(it.id)) {
            seen.add(it.id);
            target.items.push(it);
          }
        }
        removedIds.add(overflow[i].id);
      }
      // If multiple distinct themes were merged into the 3rd slot, give it a clear general label
      if (overflow.length > 1) {
        target.name = tr("generalSubthemeName", null, settings);
      }
      void keep;
      void parentId;
    }

    return removedIds.size > 0 ? groups.filter((g) => !removedIds.has(g.id)) : groups;
  }

  /**
   * Refines any large Level-1 axis (>= subthemeMinItems items) into Level-2 numbered subthemes
   * (capped at MAX_SUBTHEMES_PER_AXIS = 3) when fine-grained 2-level filtering is enabled.
   */
  function subdivideAxisGroupsOffline(groups, targetTree, settings) {
    if (settings.enableSubthemes === false || settings.allowCreateNew === false) {
      return groups;
    }
    const minItems = Math.max(2, Number(settings.subthemeMinItems) || 4);
    const existingEixoByKey = new Map(
      ((targetTree && targetTree.eixos) || []).map((e) => [e.key, e])
    );
    const parentIdsWithKids = new Set(
      groups.filter((g) => g.isSubtheme && g.parentGroupId).map((g) => g.parentGroupId)
    );
    const isEn = getActiveLocale(settings) === "en-US";
    const result = [];

    for (const g of groups) {
      result.push(g);
      if (g.isSubtheme) continue;
      if (parentIdsWithKids.has(g.id)) continue;
      if (!Array.isArray(g.items) || g.items.length < minItems) continue;

      if (!g.isNew && g.existingKey) {
        const ex = existingEixoByKey.get(g.existingKey);
        if (ex && Array.isArray(ex.children) && ex.children.length > 0) continue;
      }

      const seed = findMatchingTopicSeed(g.name);
      if (!seed || !Array.isArray(seed.subthemes) || seed.subthemes.length < 2) continue;

      const buckets = new Map();
      const otherItems = [];

      for (const item of g.items) {
        const vec = buildItemVector(item);
        let bestSub = null;
        let bestScore = 0;
        for (const sub of seed.subthemes) {
          const kwSet = new Set(sub.keywords.map((k) => tokenize(k)[0]).filter(Boolean));
          let sc = 0;
          for (const [tok, w] of vec.entries()) {
            if (kwSet.has(tok)) sc += w;
          }
          if (sc > bestScore) {
            bestScore = sc;
            bestSub = sub;
          }
        }
        if (bestSub && bestScore > 0) {
          const subTitle = isEn ? bestSub.nameEn || bestSub.name : bestSub.name;
          if (!buckets.has(subTitle)) buckets.set(subTitle, []);
          buckets.get(subTitle).push(item);
        } else {
          otherItems.push(item);
        }
      }

      if (otherItems.length > 0 && buckets.size >= 1) {
        const otherLabel = tr("generalSubthemeName", null, settings);
        buckets.set(otherLabel, otherItems);
      }

      // Only subdivide if at least 2 distinct subthemes have items
      if (buckets.size < 2) continue;

      let sortedBuckets = Array.from(buckets.entries()).sort((a, b) => b[1].length - a[1].length);
      if (sortedBuckets.length > MAX_SUBTHEMES_PER_AXIS) {
        const top = sortedBuckets.slice(0, MAX_SUBTHEMES_PER_AXIS - 1);
        const tailItems = [];
        const tailSeen = new Set();
        for (const [, list] of sortedBuckets.slice(MAX_SUBTHEMES_PER_AXIS - 1)) {
          for (const it of list) {
            if (!tailSeen.has(it.id)) {
              tailSeen.add(it.id);
              tailItems.push(it);
            }
          }
        }
        top.push([tr("generalSubthemeName", null, settings), tailItems]);
        sortedBuckets = top;
      }
      for (const [subName, subItems] of sortedBuckets) {
        const normSub = subName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        result.push({
          id: `sub:${g.id}:${normSub}`,
          isNew: true,
          isManual: false,
          isSubtheme: true,
          parentGroupId: g.id,
          existingKey: null,
          parentKey: g.existingKey || "__ROOT__",
          parentName: g.name,
          name: subName,
          enabled: true,
          items: subItems,
        });
      }
      // Parent axis becomes the Level-1 container folder for its finely filtered Level-2 subthemes
      g.items = [];
    }

    return result;
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
          reason: tr("clsReasonEmptyDisabled", null, settings),
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
            name: formatNumberedAxisName(getSeedLocalizedName(m.seed, settings), nextNum++),
          })),
          reason: tr("clsReasonEmptySeed", { terms }, settings),
          suggestNewHint: true,
          scores: [],
        };
      }
      const firstCleanTag = (itemMeta.tags || []).find((t) => String(t).trim().length >= 3);
      const fallbackRaw = firstCleanTag
        ? String(firstCleanTag).trim()
        : tr("generalAxisName", null, settings);
      const fallbackName = formatNumberedAxisName(fallbackRaw, getNextRootAxisNumber(targetTree));
      return {
        engineUsed: "offline",
        selectedKeys: [],
        proposedNew: [{ parentKey: "__ROOT__", name: fallbackName }],
        reason: tr("clsReasonEmptyInitial", { name: fallbackName }, settings),
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
      reason = tr("clsReasonOfflineMatch", { terms: topTerms || "title/topic" }, settings);
    } else if (allowCreateNew) {
      const seedMatches = scoreAgainstTopicSeeds(itemVec, maxTargets);
      let nextNum = getNextRootAxisNumber(targetTree);
      for (const m of seedMatches) {
        const seedName = getSeedLocalizedName(m.seed, settings);
        const existing =
          findExistingLeafByName(leaves, seedName) ||
          findExistingLeafByName(leaves, m.seed.name) ||
          findExistingLeafByName(leaves, m.seed.nameEn);
        if (existing) {
          if (!selected.some((s) => s.key === existing.key)) {
            selected.push({ key: existing.key, name: existing.name, matchedTerms: m.matchedTerms });
          }
        } else {
          proposedNew.push({ parentKey: "__ROOT__", name: formatNumberedAxisName(seedName, nextNum++) });
        }
      }
      if (selected.length > 0 || proposedNew.length > 0) {
        const terms = seedMatches[0] ? seedMatches[0].matchedTerms.join(", ") : "";
        reason =
          proposedNew.length > 0
            ? tr("clsReasonOfflineNewSeed", { terms }, settings)
            : tr("clsReasonOfflineTopicMatch", { terms }, settings);
      } else {
        const genName = tr("generalAxisName", null, settings);
        const existingFallback =
          findExistingLeafByName(leaves, genName) ||
          findExistingLeafByName(leaves, "Geral e Outros Temas") ||
          findExistingLeafByName(leaves, "General & Other Topics");
        if (existingFallback) {
          selected.push({ key: existingFallback.key, name: existingFallback.name, matchedTerms: [] });
          reason = tr("clsReasonOfflineFallbackExisting", { name: existingFallback.name }, settings);
        } else {
          const numberedFallback = formatNumberedAxisName(genName, nextNum++);
          proposedNew.push({ parentKey: "__ROOT__", name: numberedFallback });
          reason = tr("clsReasonOfflineFallbackNew", { name: numberedFallback }, settings);
        }
      }
    } else {
      reason = tr("clsReasonOfflineLow", null, settings);
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

    const isEn = getActiveLocale(settings) === "en-US";
    const outputLangLabel = isEn ? "English" : "Portuguese (PT-BR)";
    return (
      `You are an expert academic librarian organizing a Zotero library.\n` +
      `Classify the item below into 1 up to ${maxTargets} thematic subcollections.\n\n` +
      `ACCURACY RULES (AI + KEYWORD CROSS-CHECK + FULL PARENT METADATA):\n` +
      `1. Consider ALL parent item metadata (title, authors, year, publisher, series, DOI, ISBN, journal, abstract, tags) plus your bibliographic knowledge of the work/author.\n` +
      `2. Compare your semantic analysis with KEYWORD_ANALYSIS below: confirm agreements, fix keyword false positives, and combine complementary axes for interdisciplinary works.\n` +
      `3. Use EXACTLY the keys ("key") listed in TREE.\n` +
      `4. ${
        allowNew
          ? `If the item clearly introduces a new topic not well covered by existing folders, propose at most 1 new subcollection in "new_subcollections" (with "parent_key" of an existing axis or "__ROOT__"). Write new folder names in ${outputLangLabel} using numbered format "01 - Axis Name" (or "N.M Subtheme Name" inside a numbered axis).`
          : `Do NOT propose new subcollections ("new_subcollections": []).`
      }\n` +
      `5. Reply EXCLUSIVELY with valid JSON (write "reason" in ${outputLangLabel}, 1 short sentence mentioning AI + keyword cross-check):\n` +
      `{"selected_keys":["KEY1"],"new_subcollections":[{"parent_key":"__ROOT__","name":"01 - Name"}],"reason":"Short justification."}\n\n` +
      `TREE:${JSON.stringify(treeSummary)}\n` +
      `KEYWORD_ANALYSIS:${JSON.stringify(kwSummary)}\n` +
      `PARENT_ITEM:${JSON.stringify(compactParentMeta(itemMeta))}`
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

  function sanitizeErr(err) {
    const raw = (err && err.message) || String(err || "");
    if (typeof EixosCrypto !== "undefined" && typeof EixosCrypto.sanitizeErrorText === "function") {
      return EixosCrypto.sanitizeErrorText(raw);
    }
    return raw
      .replace(/([?&]key=)[^&\s"']+/gi, "$1***")
      .replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, "$1***")
      .replace(/\bAIza[0-9A-Za-z\-_]{16,}\b/g, "AIza***")
      .replace(/\bsk-[A-Za-z0-9\-_]{16,}\b/g, "sk-***");
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
          const safe = new Error(sanitizeErr(err));
          safe.status = status;
          throw safe;
        }
        await sleepMs(900 * (i + 1));
      }
    }
    const safe = new Error(sanitizeErr(lastErr));
    throw safe;
  }

  async function callGemini(prompt, settings, timeoutMs) {
    const apiKey = settings.aiApiKey;
    if (!apiKey) throw new Error("Gemini API key is not configured.");
    const model = settings.aiModel || "gemini-3.5-flash";
    // Send API key via official HTTP header instead of URL query string so it never appears in logs
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    };

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
          headers,
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
            headers,
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
          content: "Always reply exclusively with valid JSON matching the requested schema.",
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
      reason: String(parsed.reason || tr("clsReasonAIHybrid", null, settings)).trim(),
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
        fallback.reason = tr(
          "clsReasonFallbackAI",
          { err: err.message || err, base: fallback.reason },
          settings
        );
        fallback.aiError = String(err.message || err);
        return fallback;
      }
    }

    const offline = classifyOffline(itemMeta, targetTree, settings);
    if (engine === "hybrid" && !hasAIConfigured(settings)) {
      offline.reason = tr("clsReasonHybridNoKey", { base: offline.reason }, settings);
    }
    return offline;
  }

  async function testAIConnection(settings) {
    const pingPrompt = 'Reply ONLY with this JSON: {"ok": true, "message": "Connection OK"}';
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

    const baseGroups = Array.from(groupsMap.values())
      .map((g) => {
        delete g._seenIds;
        return g;
      })
      .sort((a, b) => {
        if (Boolean(a.isManual) !== Boolean(b.isManual)) return a.isManual ? -1 : 1;
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        return b.items.length - a.items.length;
      });

    const subdivided = subdivideAxisGroupsOffline(baseGroups, targetTree, effectiveSettings);
    const groups = applyNumberingToNewGroups(subdivided, targetTree);

    const newAxesCount = groups.filter((g) => g.isNew && !g.isSubtheme).length;
    const existCount = groups.filter((g) => !g.isNew).length;
    const subCount = groups.filter((g) => g.isSubtheme).length;
    const subExtra =
      subCount > 0 ? tr("clsPlanSubPart", { count: subCount }, settings) : "";
    const reason =
      existCount > 0
        ? tr(
            "clsPlanOffExisting",
            {
              exist: existCount,
              newPart:
                newAxesCount > 0
                  ? tr("clsPlanOffNewPart", { count: newAxesCount }, settings) + subExtra
                  : subExtra,
            },
            settings
          )
        : tr("clsPlanOffInitial", { count: newAxesCount, items: itemsMeta.length }, settings) +
          (subCount > 0 ? ` (${subCount} ${getActiveLocale(settings) === "en-US" ? "subthemes" : "subtemas"})` : "");

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

    // 1. Run fast offline keyword plan FIRST for cross-checking (including 2-level subtheme hints)!
    const offlinePlan = buildBatchPlanOffline(itemsMeta, targetTree, settings, manualList);
    const offlineHintsByItem = new Map();
    for (const grp of offlinePlan.groups || []) {
      const hintLabel =
        grp.isSubtheme && grp.parentName ? `${grp.parentName} › ${grp.name}` : grp.name;
      for (const it of grp.items || []) {
        if (!offlineHintsByItem.has(it.id)) offlineHintsByItem.set(it.id, []);
        offlineHintsByItem.get(it.id).push(hintLabel);
      }
    }

    const existingLeaves = (safeTree.leaves || []).map((l) => ({
      key: l.key,
      name: l.name,
      parent: l.parentName || null,
    }));

    const maxTargets = settings.maxTargets || 3;
    const allowNew = settings.allowCreateNew !== false;
    const enableSubthemes = settings.enableSubthemes !== false && allowNew;
    const subthemeMinItems = Math.max(2, Number(settings.subthemeMinItems) || 4);

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

    const offlineAxesSummary = (offlinePlan.groups || []).map((g) =>
      g.isSubtheme && g.parentName ? `${g.parentName} › ${g.name}` : g.name
    );

    const isEn = getActiveLocale(settings) === "en-US";
    const outputLangLabel = isEn ? "English" : "Portuguese (PT-BR)";

    const runChunk = async (chunk, sharedNewAxes) => {
      const subthemeRule = enableSubthemes
        ? `4. FINE-GRAINED 2-LEVEL SUBTHEMES: Whenever an axis receives ${subthemeMinItems} or more items, subdivide it into 2 to 3 specific numbered subthemes (STRICT MAXIMUM of 3 subthemes per axis) inside "subthemes" (e.g. "1.1 Feminist Theory", "1.2 Sexual Violence in Armed Conflicts") in ${outputLangLabel} and keep the parent axis's "item_ids": []. For axes with fewer than ${subthemeMinItems} items, keep "subthemes": [] and put items directly in "item_ids".\n` +
          `5. Reply EXCLUSIVELY with valid JSON:\n` +
          `{"axes":[{"existing_key":null,"name":"01 - Axis Name","item_ids":[],"subthemes":[{"existing_key":null,"name":"1.1 Subtheme Name","item_ids":[1,2]}]}],"summary":"Short summary in ${outputLangLabel}."}\n\n`
        : `4. Reply EXCLUSIVELY with valid JSON:\n` +
          `{"axes":[{"existing_key":null,"name":"01 - Axis Name","item_ids":[1,2]}],"summary":"Short summary in ${outputLangLabel}."}\n\n`;

      const prompt =
        `You are an expert academic librarian organizing a Zotero collection.\n` +
        `Classify ALL ${chunk.length} items below (1 to ${maxTargets} themes per item) by cross-checking:\n` +
        `(a) full parent item metadata (title, authors, publisher, journal, series, DOI, ISBN, tags) + your bibliographic knowledge;\n` +
        `(b) the "kw_hint" field from local keyword analysis — confirm agreements and fix keyword false positives.\n\n` +
        `RULES:\n` +
        `1. ${
          existingLeaves.length > 0
            ? `Prefer EXISTING folders listed below (provide "existing_key").`
            : `Destination folder is empty — create 4 to 10 coherent thematic axes in ${outputLangLabel}.`
        }\n` +
        (manualList.length > 0
          ? `2. User manually created these indices (USE their exact names when applicable): ${JSON.stringify(manualList)}.\n`
          : "") +
        `3. ${
          allowNew
            ? `You may propose new axes ("existing_key": null, "name": "01 - Axis Name" in ${outputLangLabel}, always starting with "01 - ", "02 - ", etc.), reusing already proposed names whenever appropriate.`
            : `Do NOT propose new axes; use only "existing_key".`
        }\n` +
        subthemeRule +
        `EXISTING_FOLDERS:${JSON.stringify(existingLeaves)}\n` +
        `KEYWORD_AXES:${JSON.stringify(sharedNewAxes.length > 0 ? sharedNewAxes : offlineAxesSummary)}\n` +
        `ITEMS:${JSON.stringify(chunk)}`;

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
    for (const mName of manualList) {
      const gid = `new:__ROOT__:${normKey(mName)}`;
      if (!groupsMap.has(gid)) {
        groupsMap.set(gid, {
          id: gid,
          isNew: true,
          isManual: true,
          isSubtheme: false,
          parentGroupId: null,
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

    function ensureGroupEntry(gid, meta) {
      if (!groupsMap.has(gid)) {
        groupsMap.set(
          gid,
          Object.assign(
            {
              enabled: true,
              isSubtheme: false,
              parentGroupId: null,
              items: [],
              _seen: new Set(),
            },
            meta
          )
        );
      }
      return groupsMap.get(gid);
    }

    function addToGroup(gid, meta, item) {
      const g = ensureGroupEntry(gid, meta);
      if (item && !g._seen.has(item.id)) {
        g._seen.add(item.id);
        g.items.push(item);
        assignedIds.add(item.id);
      }
      return g;
    }

    function absorbParsed(parsed) {
      for (const ax of Array.isArray(parsed && parsed.axes) ? parsed.axes : []) {
        if (!ax) continue;
        const validLeaf = ax.existing_key && leafByKey.get(ax.existing_key);
        const directIds = Array.isArray(ax.item_ids) ? ax.item_ids : [];
        const rawSubthemes = enableSubthemes && Array.isArray(ax.subthemes) ? ax.subthemes : [];

        // Resolve or register Level-1 axis container first
        let parentGroup = null;
        if (validLeaf) {
          parentGroup = ensureGroupEntry(`existing:${validLeaf.key}`, {
            id: `existing:${validLeaf.key}`,
            isNew: false,
            isManual: false,
            isSubtheme: Boolean(validLeaf.parentKey),
            parentGroupId: null,
            existingKey: validLeaf.key,
            parentKey: validLeaf.parentKey || "__ROOT__",
            parentName: validLeaf.parentName || null,
            name: validLeaf.name,
          });
        } else if (allowNew && ax.name && String(ax.name).trim()) {
          const cleanName = String(ax.name).trim();
          const n = normKey(cleanName);
          if (directIds.length > 0 || rawSubthemes.length > 0) {
            parentGroup = ensureGroupEntry(`new:__ROOT__:${n}`, {
              id: `new:__ROOT__:${n}`,
              isNew: true,
              isManual: manualNormSet.has(n),
              isSubtheme: false,
              parentGroupId: null,
              existingKey: null,
              parentKey: "__ROOT__",
              parentName: null,
              name: cleanName,
            });
          }
        }

        // Direct items on axis
        if (parentGroup) {
          for (const rawId of directIds) {
            const item = itemById.get(Number(rawId));
            if (item) addToGroup(parentGroup.id, parentGroup, item);
          }
        }

        // Nested Level-2 subthemes inside this axis
        if (parentGroup && rawSubthemes.length > 0) {
          for (const sub of rawSubthemes) {
            if (!sub || !Array.isArray(sub.item_ids) || sub.item_ids.length === 0) continue;
            const validSubLeaf = sub.existing_key && leafByKey.get(sub.existing_key);
            for (const rawId of sub.item_ids) {
              const item = itemById.get(Number(rawId));
              if (!item) continue;
              if (validSubLeaf) {
                addToGroup(
                  `existing:${validSubLeaf.key}`,
                  {
                    id: `existing:${validSubLeaf.key}`,
                    isNew: false,
                    isManual: false,
                    isSubtheme: true,
                    parentGroupId: parentGroup.id,
                    existingKey: validSubLeaf.key,
                    parentKey: validSubLeaf.parentKey || parentGroup.existingKey || "__ROOT__",
                    parentName: validSubLeaf.parentName || parentGroup.name,
                    name: validSubLeaf.name,
                  },
                  item
                );
              } else if (sub.name && String(sub.name).trim()) {
                const subClean = String(sub.name).trim();
                const sn = normKey(subClean);
                addToGroup(
                  `sub:${parentGroup.id}:${sn}`,
                  {
                    id: `sub:${parentGroup.id}:${sn}`,
                    isNew: true,
                    isManual: false,
                    isSubtheme: true,
                    parentGroupId: parentGroup.id,
                    existingKey: null,
                    parentKey: parentGroup.existingKey || "__ROOT__",
                    parentName: parentGroup.name,
                    name: subClean,
                  },
                  item
                );
              }
            }
          }
        }
      }
    }

    // Run chunk 1 first to establish unified axis & subtheme names, then remaining chunks in parallel
    if (chunks.length > 0) {
      const firstParsed = await runChunk(chunks[0], manualList);
      absorbParsed(firstParsed);

      const establishedAxes = Array.from(groupsMap.values())
        .filter((g) => g.isNew)
        .map((g) => (g.isSubtheme && g.parentName ? `${g.parentName} › ${g.name}` : g.name));

      for (let i = 1; i < chunks.length; i += 2) {
        const pair = chunks.slice(i, i + 2);
        const results = await Promise.all(pair.map((ch) => runChunk(ch, establishedAxes)));
        for (const r of results) absorbParsed(r);
      }
    }

    // Reconcile any item omitted by AI using the offline keyword cross-check (preserving 2-level subthemes!)
    const offlineById = new Map((offlinePlan.groups || []).map((g) => [g.id, g]));
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
              isSubtheme: Boolean(leaf.parentKey),
              parentGroupId: null,
              existingKey: leaf.key,
              parentKey: leaf.parentKey || "__ROOT__",
              parentName: leaf.parentName || null,
              name: leaf.name,
            },
            it
          );
        } else if (allowNew) {
          if (grp.isSubtheme && grp.parentGroupId && offlineById.has(grp.parentGroupId)) {
            const pOff = offlineById.get(grp.parentGroupId);
            const pn = normKey(pOff.name);
            const pGrp = ensureGroupEntry(`new:__ROOT__:${pn}`, {
              id: `new:__ROOT__:${pn}`,
              isNew: true,
              isManual: manualNormSet.has(pn),
              isSubtheme: false,
              parentGroupId: null,
              existingKey: null,
              parentKey: "__ROOT__",
              parentName: null,
              name: pOff.name,
            });
            const sn = normKey(grp.name);
            addToGroup(
              `sub:${pGrp.id}:${sn}`,
              {
                id: `sub:${pGrp.id}:${sn}`,
                isNew: true,
                isManual: false,
                isSubtheme: true,
                parentGroupId: pGrp.id,
                existingKey: null,
                parentKey: "__ROOT__",
                parentName: pGrp.name,
                name: grp.name,
              },
              it
            );
          } else {
            const n = normKey(grp.name);
            addToGroup(
              `new:__ROOT__:${n}`,
              {
                id: `new:__ROOT__:${n}`,
                isNew: true,
                isManual: manualNormSet.has(n),
                isSubtheme: false,
                parentGroupId: null,
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
    }

    const unassigned = itemsMeta.filter((it) => !assignedIds.has(it.id));

    // Drop any empty non-manual root axes that have neither direct items nor child subthemes
    const activeParentIds = new Set(
      Array.from(groupsMap.values())
        .filter((g) => g.isSubtheme && g.parentGroupId && g.items.length > 0)
        .map((g) => g.parentGroupId)
    );
    const totalCountForRoot = (rootId) => {
      let c = 0;
      for (const x of groupsMap.values()) {
        if (x.id === rootId || x.parentGroupId === rootId) c += x.items.length;
      }
      return c;
    };

    const rawGroups = Array.from(groupsMap.values())
      .filter((g) => g.isManual || g.items.length > 0 || activeParentIds.has(g.id))
      .map((g) => {
        delete g._seen;
        return g;
      })
      .sort((a, b) => {
        if (Boolean(a.isManual) !== Boolean(b.isManual)) return a.isManual ? -1 : 1;
        const ca = a.isSubtheme ? a.items.length : totalCountForRoot(a.id);
        const cb = b.isSubtheme ? b.items.length : totalCountForRoot(b.id);
        return cb - ca;
      });

    // Safety net: subdivide any large flat axis that AI left unsplit, and enforce strict max 3 subthemes per axis
    const subdivided = subdivideAxisGroupsOffline(rawGroups, targetTree, settings);
    const capped = enforceMaxSubthemesPerAxis(subdivided, settings);
    const groups = applyNumberingToNewGroups(capped, targetTree);

    const rootAxesCount = groups.filter((g) => !g.isSubtheme).length;
    const subthemesCount = groups.filter((g) => g.isSubtheme).length;
    const subPart =
      subthemesCount > 0 ? tr("clsPlanSubPart", { count: subthemesCount }, settings) : "";
    const extraNote =
      reconciledFromOffline > 0
        ? tr("clsPlanAIReconciled", { count: reconciledFromOffline }, settings)
        : "";
    return {
      engineUsed: `ai:${settings.aiProvider}`,
      reason: tr(
        "clsPlanAI",
        {
          provider: settings.aiProvider,
          axes: rootAxesCount,
          subPart,
          items: itemsMeta.length,
          extra: extraNote,
        },
        settings
      ),
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
        fallback.reason = tr(
          "clsReasonFallbackAI",
          { err: err.message || err, base: fallback.reason },
          settings
        );
        return fallback;
      }
    }
    const offline = buildBatchPlanOffline(itemsMeta, targetTree, settings, customAxes);
    if (engine === "hybrid" && !hasAIConfigured(settings)) {
      offline.reason = tr("clsReasonHybridNoKey", { base: offline.reason }, settings);
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

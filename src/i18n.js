/* global Zotero */

var EixosI18n = (function () {
  const STRINGS = {
    "pt-BR": {
      pluginName: "Organizer",
      defaultRootSuffix: "Por Eixo e Tema",

      // Preferences Pane
      prefTitle: "Organizer — Classificação Automática por Eixo e Tema",
      prefSubtitle:
        "100% não-destrutivo: nunca apaga itens, nunca remove da pasta original e nunca duplica arquivos.",
      prefLangSection: "Idioma / Language",
      prefLangLabel: "Idioma da interface e das sugestões:",
      prefLangAuto: "Automático (seguir idioma do Zotero)",
      prefLangPt: "Português (Brasil)",
      prefLangEn: "English",

      prefSec1Title: "1. Pastas Gerenciadas (Origem → Árvore de Eixos e Temas)",
      prefBtnAutodiscover: "Detectar Automaticamente",
      prefBtnRefreshCols: "Atualizar Listas",
      prefLabelSource: "Pasta a gerenciar:",
      prefLabelTarget: "Subcoleção temática de destino:",
      prefTargetAuto:
        'Automático: usar existente ou criar "<Pasta> - Por Eixo e Tema" dentro da pasta',
      prefCheckRuleCreate: "Permitir criar novos eixos/temas nesta regra",
      prefBtnAddRule: "+ Adicionar Pasta Gerenciada",
      prefRulesEmpty:
        "Nenhuma pasta gerenciada ainda. Clique em 'Detectar Automaticamente' ou adicione uma regra abaixo.",
      prefRuleToggleTitle: "Ativar/desativar monitoramento desta pasta",
      prefRuleAllowNew: "Permite criar novos temas quando necessário",
      prefRuleExistingOnly: "Usa apenas temas já existentes",
      prefBtnOpenPlan: "Organizar / Ver Plano…",
      prefBtnRemoveRule: "Remover Regra",
      prefBtnRemoveRuleTitle:
        "Remove apenas a regra do plugin (não apaga nenhuma pasta nem livro no Zotero)",

      prefSec2Title: "2. Comportamento ao Adicionar Novo Item",
      prefLabelMode: "Ao adicionar 1 item novo em pasta gerenciada:",
      prefModeAuto: "Automático com notificação (recomendado — anexa no eixo e avisa onde foi)",
      prefModeInteractive: "Interativo (abre janela para confirmar antes de vincular)",
      prefLabelMaxTargets: "Máximo de temas por item:",
      prefBatchHint:
        "Ao organizar uma coleção inteira (botão direito → Organizar por Eixo e Tema), o plugin sempre mostra primeiro o plano completo em uma única tela para você revisar e executar de uma vez.",
      prefCheckAllowCreate: "Permitir sugerir/criar novas subcoleções quando surgir um tema novo",
      prefCheckSkipClassified:
        "Não mexer em itens que eu já coloquei diretamente em algum eixo/tema da subcoleção",

      prefSec3Title: "3. Motor de Classificação (Híbrido: IA + Offline)",
      prefLabelEngine: "Motor:",
      prefEngineHybrid: "Híbrido (cruza IA + palavras-chave; fallback offline sem API)",
      prefEngineAI: "Somente IA (erro se IA não estiver configurada)",
      prefEngineOffline: "Somente Offline (similaridade textual local, sem API)",
      prefLabelProvider: "Provedor de IA:",
      prefProviderGemini: "Google Gemini (AI Studio)",
      prefProviderOpenAI: "OpenAI (ChatGPT API)",
      prefProviderCustom: "Ollama / Endpoint compatível com OpenAI",
      prefLabelApiKey: "Chave de API (criptografada localmente neste PC — nunca sobe para sync/Git):",
      prefPlaceholderApiKey: "Cole sua API key (ex.: AIza... ou sk-...)",
      prefLabelModel: "Modelo:",
      prefLabelEndpoint: "URL do endpoint (para Ollama / compatível com OpenAI):",
      prefBtnTestAI: "Testar Conexão com IA",
      prefBtnClearKey: "Limpar Chave",
      prefKeyStatusNss: "🔒 Salva criptografada localmente (cofre NSS key4.db do Zotero)",
      prefKeyStatusAes: "🔒 Salva criptografada localmente (AES-256-GCM)",
      prefKeyStatusEmpty: "Nenhuma chave de API salva neste computador.",
      statusKeySavedEnc: "Chave de API criptografada e salva localmente ({method}).",
      statusKeyCleared: "Chave de API removida do cofre local.",
      statusKeyEncryptErr: "Erro ao criptografar chave: {err}",

      prefSec4Title: "4. Sincronizar Regras do Plugin (Opcional)",
      prefCheckSyncLib:
        "Compartilhar automaticamente a lista de pastas monitoradas com outros PCs desta biblioteca",
      prefSyncHelp:
        "As coleções e PDFs já são sincronizados nativamente pelo Zotero/WebDAV. Esta opção sincroniza apenas quais pastas o plugin deve vigiar (em uma nota interna, sem chaves de API), para que outras pessoas não precisem reconfigurar as regras manualmente.",
      prefBtnSyncPush: "Salvar na Nota Sincronizada",
      prefBtnSyncPull: "Recarregar da Biblioteca",
      prefBtnExport: "Exportar JSON",
      prefBtnImport: "Importar JSON",

      // Status messages
      statusSaved: "Configurações salvas.",
      statusSavedSynced: "Regras salvas e sincronizadas na biblioteca.",
      statusSavedLocalErr: "Salvo localmente (erro ao sincronizar nota: {err})",
      statusSavedLocal: "Regras salvas localmente.",
      statusColsUpdated: "Lista atualizada ({count} coleções).",
      statusNoPairsFound: "Nenhum par temático ('Por Eixo e Tema' / 'By Axis & Theme') encontrado.",
      statusPairsFound: "{count} par(es) detectado(s) automaticamente!",
      statusSelectSource: "Selecione uma pasta de origem.",
      statusTargetPrepErr: "Erro ao preparar subcoleção destino: {err}",
      statusSameFolder: "A pasta de origem e a pasta destino devem ser diferentes.",
      statusDuplicateRule: "Essa regra de pasta já está cadastrada.",
      statusTestingAI: "Testando conexão…",
      statusAIOk: "Conexão OK ({provider} / {model})!",
      statusAIFail: "Falha: {err}",
      statusLoadedFromLib: "Carregado da biblioteca ({count} regra(s)).",
      statusNoSyncNote: "Nenhuma nota de configuração sincronizada encontrada na biblioteca.",
      statusLoadErr: "Erro ao carregar: {err}",
      statusExportOk: "Configuração exportada com sucesso (sem chaves de API).",
      statusExportErr: "Erro ao exportar: {err}",
      statusImportOk: "Configuração importada ({count} regra(s))!",
      statusImportErr: "Erro ao importar: {err}",
      statusApiUnavailable: "API do Organizer indisponível. Reative o plugin.",
      statusInitErr: "Erro ao carregar painel: {err}",
      filePickerExportTitle: "Exportar configuração Organizer",
      filePickerImportTitle: "Importar configuração Organizer",

      // Plan Dialog
      planWindowTitle: "Organizer — Plano de Organização por Eixos",
      planTitleFmt: "Organizar “{source}” ({count} pendente(s))",
      planSubtitle:
        'Revise, crie índices manuais ou ajuste os eixos abaixo. Ao clicar em "Executar Organização", a janela permanece aberta até verificar no Zotero se cada item foi realmente indexado.',
      planDestExistingLabel: "Usando subcoleção temática já existente:",
      planDestNewLabel: "Criar subcoleção dentro de “{source}”:",
      planBadgeExisting: "Existente",
      planBadgeNewSub: "Nova subcoleção",
      planBadgeNewFolder: "Nova pasta",
      planBadgeManual: "Manual",
      planBadgeAI: "IA + Palavras-chave ({provider})",
      planBadgeOffline: "Modo Offline",
      planBtnReAI: "Reanalisar com IA",
      planBtnReOffline: "Reanalisar Offline",
      planManualLabel: "Criar índice/eixo manualmente:",
      planManualPlaceholder: "Ex.: 01 - Fontes Primárias, História da Coreia, Metodologia…",
      planBtnAddManual: "+ Criar Índice",
      planSearchPlaceholder: "Filtrar eixos ou títulos…",
      planBtnSelectAll: "Marcar todos",
      planBtnUnselectAll: "Desmarcar todos",
      planEmptyGroups:
        "Nenhum eixo ainda. Use a caixa acima para criar um índice manualmente ou clique em Reanalisar.",
      planItemCount: "{count} item(ns)",
      planBtnAssign: "+ Atribuir itens",
      planBtnCloseAssign: "Fechar seleção",
      planBtnViewItems: "Ver itens ▾",
      planBtnHideItems: "Ocultar ▴",
      planPickerPlaceholder: "Buscar livros/artigos para atribuir a este índice…",
      planManualEmptyHint:
        'Índice manual vazio — clique em "+ Atribuir itens" ou "Reanalisar" para preencher, ou execute assim para criar a pasta pronta.',
      planAxisEmptyHint: "Nenhum item neste eixo.",
      planItemRmTitle:
        "Retirar deste eixo no plano (use '+ Atribuir itens' em outro eixo para incluir lá)",
      planReanalyzingAI: "Analisando coleção com IA + cruzamento por palavras-chave… aguarde.",
      planReanalyzingOff: "Recalculando plano offline…",
      planReanalyzeErr: "Erro ao reanalisar: {err}",
      planSummaryFmt: "{axes} eixo(s) • {items} item(ns) único(s) ({links} vínculo(s)){newPart} — nada será apagado",
      planSummaryNewPart: " • {count} nova(s) pasta(s)",
      planSummaryNone: "Nenhum eixo selecionado",
      planBtnCancel: "Cancelar",
      planBtnExecute: "Executar Organização",
      planBtnExecuteCount: "Executar Organização ({count} itens)",
      planBtnExecuting: "Executando e verificando…",
      planBtnDoneClose: "Concluir e Fechar",
      planBtnRetryMissing: "Tentar novamente pendentes",
      planExecStart: "Iniciando criação de pastas e indexação no Zotero…",
      planExecWarn:
        "Atenção: {verified}/{total} itens verificados ({missing} com pendência na verificação).",
      planExecMissingLine: "• {title} — faltou em: {cols}",
      planExecMoreMissing: "… e mais {count} item(ns).",
      planExecOk:
        "Verificado no Zotero: {verified}/{total} item(ns) confirmados nas subcoleções do plano!",
      planExecCreatedPart: "{count} pasta(s) criada(s)",
      planExecReusedPart: "pastas existentes reutilizadas",
      planExecDetailsOk:
        "Destino: {dest} • {vLinks}/{tLinks} vínculos reais confirmados no banco do Zotero • {created} • Monitoramento automático ativado.",
      planExecErr: "Erro durante a execução: {err}",
      planExecErrSafe: "Nenhum item ou pasta foi apagado. Você pode tentar executar novamente.",
      planAxisNameTitle: "Você pode renomear este eixo antes de executar",

      // Classify Dialog (single item)
      clsWindowTitle: "Organizer — Classificar Item",
      clsBatchProgress: "   •   Item {index} de {total}",
      clsSearchPlaceholder: "Filtrar eixos ou temas…",
      clsBtnReAI: "Reanalisar com IA",
      clsBtnReOff: "Reanalisar Offline",
      clsEmptyTree:
        "Esta árvore destino ainda não possui subcoleções. Use a caixa abaixo para criar o primeiro eixo/tema.",
      clsPillSuggested: "Sugerido",
      clsNewTitle: "Criar nova subcoleção / tema (opcional)",
      clsNewPlaceholder: "Ex.: 9.3 História Ambiental (ou novo eixo)",
      clsBtnAddNew: "+ Incluir",
      clsNewRootOpt: "Novo eixo na raiz ({root})",
      clsNewInsideOpt: "Dentro de: {eixo}",
      clsNewChipFmt: 'Nova pasta: "{name}" em [{parent}]',
      clsRootParentFmt: "Raiz ({root})",
      clsBtnAbort: "Cancelar Lote",
      clsBtnSkip: "Pular",
      clsBtnConfirm: "Confirmar e Vincular",
      clsSummarySelected: "Selecionado: {parts}",
      clsSummaryExisting: "{count} existente(s)",
      clsSummaryNew: "{count} nova(s) pasta(s)",
      clsSummaryNone: "Nenhum tema selecionado",
      clsReanalyzingAI: "Consultando IA + palavras-chave…",
      clsReanalyzingOff: "Recalculando similaridade offline…",
      clsNoTitle: "(Sem título)",

      // Main controller & toasts
      toastOrganizedTitle: "Organizer — Item organizado",
      toastLinkedLine: "Anexado em {root} → {names}{created}",
      toastNewFolderSuffix: " (nova pasta: {names})",
      toastNoChangeTitle: "Organizer — Sem alteração",
      toastNoChangeFallback:
        "Nenhuma pasta correspondente encontrada (clique com botão direito no item para classificar manualmente).",
      toastSelectCollection: "Selecione primeiro uma coleção no painel esquerdo.",
      toastIsTargetRoot1: "“{name}” já é uma subcoleção temática de destino.",
      toastIsTargetRoot2:
        "Execute 'Organizar por Eixo e Tema' na pasta principal (ex.: Livros ou Minha biblioteca).",
      toastAllOrganized: "Todos os itens de “{source}” já estão organizados em “{dest}”!",
      toastNoDirectItems: "A coleção “{source}” não possui livros/artigos diretos para organizar.",
      toastNoValidTitle: "Nenhum item com título válido encontrado em “{source}”.",
      toastPlanningTitle: "Organizer — Gerando plano",
      toastPlanningAI: "Analisando {count} item(ns) de “{source}” com IA + palavras-chave…",
      toastPlanningOff: "Analisando {count} item(ns) de “{source}” (modo offline)…",
      toastPlanErrTitle: "Organizer — Erro ao gerar plano",
      toastWarnTitle: "Organizer — Aviso",
      toastErrTitle: "Organizer — Erro",
      toastSelectItem: "Selecione ao menos um livro, artigo ou PDF.",
      toastNoRulesOpening: "Nenhuma pasta gerenciada configurada ainda. Abrindo configurações…",
      toastSyncedLoaded: "Configuração sincronizada carregada ({count} regra(s) de pasta).",
      toastAutoDiscovered:
        "Nenhuma nota sincronizada encontrada; {count} par(es) detectado(s) localmente.",
      toastNoSyncedYet: "Nenhuma configuração sincronizada encontrada ainda na biblioteca.",
      progPrepTarget: "Preparando subcoleção temática destino…",
      progCreatingAxes: "Criando/validando {count} eixo(s)…",
      progPreparingAxis: "Preparando eixo {idx}/{total}: {name}",
      progIndexingItems: "Indexando itens ({done}/{total})…",
      progVerifyingDB: "Verificando indexação real no banco do Zotero…",
      progRetryingMissing: "Reenviando {count} item(ns) pendente(s) na verificação…",
      progDone: "Verificação concluída!",

      // Classifier messages
      clsReasonEmptyDisabled:
        "A coleção destino está vazia e a criação de novas subcoleções está desativada.",
      clsReasonEmptySeed:
        'Modo offline (pasta destino vazia): novo eixo sugerido a partir de termos como "{terms}".',
      clsReasonEmptyInitial: 'Modo offline (pasta destino vazia): criando eixo inicial "{name}".',
      clsReasonOfflineMatch:
        'Modo offline (similaridade textual): termos em comum como "{terms}".',
      clsReasonOfflineNewSeed:
        'Modo offline: novo eixo sugerido a partir de termos como "{terms}".',
      clsReasonOfflineTopicMatch: 'Modo offline: correspondência temática com "{terms}".',
      clsReasonOfflineFallbackExisting:
        'Modo offline: sem correspondência forte — encaminhado para "{name}".',
      clsReasonOfflineFallbackNew:
        'Modo offline: sem correspondência forte — sugerindo pasta "{name}".',
      clsReasonOfflineLow:
        "Modo offline: pouca correspondência com os temas atuais — você pode selecionar manualmente ou criar um novo tema.",
      clsReasonAIHybrid: "Classificado via cruzamento IA + palavras-chave.",
      clsReasonFallbackAI: "Fallback offline (IA indisponível: {err}). {base}",
      clsReasonHybridNoKey:
        "Modo offline ativo (configure uma chave de IA para cruzamento semântico + palavras-chave). {base}",
      clsPlanOffExisting:
        "Plano gerado em Modo Offline: {exist} eixo(s) existente(s) reutilizado(s){newPart}.",
      clsPlanOffNewPart: " + {count} novo(s) eixo(s) sugerido(s)",
      clsPlanOffInitial:
        "Plano inicial gerado em Modo Offline: {count} eixo(s) temático(s) sugerido(s) para {items} item(ns).",
      clsPlanAI:
        "Cruzamento IA ({provider}) + palavras-chave: {axes} eixo(s) para {items} item(ns){extra}.",
      clsPlanAIReconciled: " (+ {count} completado(s) via palavras-chave)",
      generalAxisName: "Geral e Outros Temas",
    },

    "en-US": {
      pluginName: "Organizer",
      defaultRootSuffix: "By Axis & Theme",

      // Preferences Pane
      prefTitle: "Organizer — Automatic Organization by Axis & Theme",
      prefSubtitle:
        "100% non-destructive: never deletes items, never removes items from the source collection, and never duplicates files.",
      prefLangSection: "Language / Idioma",
      prefLangLabel: "Interface and classification language:",
      prefLangAuto: "Auto (follow Zotero language)",
      prefLangPt: "Português (Brasil)",
      prefLangEn: "English",

      prefSec1Title: "1. Managed Folders (Source → Thematic Axis Tree)",
      prefBtnAutodiscover: "Auto-Detect",
      prefBtnRefreshCols: "Refresh Lists",
      prefLabelSource: "Collection to manage:",
      prefLabelTarget: "Destination thematic subcollection:",
      prefTargetAuto:
        'Automatic: use existing or create "<Folder> - By Axis & Theme" inside the folder',
      prefCheckRuleCreate: "Allow creating new axes/themes for this rule",
      prefBtnAddRule: "+ Add Managed Folder",
      prefRulesEmpty:
        "No managed folders yet. Click 'Auto-Detect' or add a folder rule below.",
      prefRuleToggleTitle: "Enable/disable monitoring for this folder",
      prefRuleAllowNew: "Can create new themes when needed",
      prefRuleExistingOnly: "Uses existing themes only",
      prefBtnOpenPlan: "Organize / Preview Plan…",
      prefBtnRemoveRule: "Remove Rule",
      prefBtnRemoveRuleTitle:
        "Removes only the plugin rule (never deletes any collection or item in Zotero)",

      prefSec2Title: "2. Behavior When Adding a New Item",
      prefLabelMode: "When adding 1 new item to a managed folder:",
      prefModeAuto: "Automatic with notification (recommended — links to axis and notifies where)",
      prefModeInteractive: "Interactive (open dialog to confirm before linking)",
      prefLabelMaxTargets: "Max themes per item:",
      prefBatchHint:
        "When organizing an entire collection (right-click → Organize by Axis & Theme), the plugin always shows a complete single-screen plan for you to review before executing.",
      prefCheckAllowCreate: "Allow suggesting/creating new subcollections when a new topic appears",
      prefCheckSkipClassified:
        "Do not touch items I already placed directly inside a thematic axis/subcollection",

      prefSec3Title: "3. Classification Engine (Hybrid: AI + Offline)",
      prefLabelEngine: "Engine:",
      prefEngineHybrid: "Hybrid (AI + keyword cross-check; offline fallback without API)",
      prefEngineAI: "AI Only (error if AI is not configured)",
      prefEngineOffline: "Offline Only (local text similarity, no API)",
      prefLabelProvider: "AI Provider:",
      prefProviderGemini: "Google Gemini (AI Studio)",
      prefProviderOpenAI: "OpenAI (ChatGPT API)",
      prefProviderCustom: "Ollama / OpenAI-compatible endpoint",
      prefLabelApiKey: "API Key (encrypted locally on this computer — never synced or committed):",
      prefPlaceholderApiKey: "Paste your API key (e.g. AIza... or sk-...)",
      prefLabelModel: "Model:",
      prefLabelEndpoint: "Endpoint URL (for Ollama / OpenAI-compatible):",
      prefBtnTestAI: "Test AI Connection",
      prefBtnClearKey: "Clear Key",
      prefKeyStatusNss: "🔒 Stored encrypted locally (Zotero NSS key4.db vault)",
      prefKeyStatusAes: "🔒 Stored encrypted locally (AES-256-GCM)",
      prefKeyStatusEmpty: "No API key saved on this computer.",
      statusKeySavedEnc: "API key encrypted and saved locally ({method}).",
      statusKeyCleared: "API key removed from local vault.",
      statusKeyEncryptErr: "Error encrypting API key: {err}",

      prefSec4Title: "4. Sync Plugin Rules (Optional)",
      prefCheckSyncLib:
        "Automatically share the list of monitored folders with other computers using this library",
      prefSyncHelp:
        "Collections and PDFs are already synced natively by Zotero Sync / WebDAV. This option syncs only which folders the plugin monitors (in an internal note, never storing API keys), so teammates do not have to reconfigure rules manually.",
      prefBtnSyncPush: "Save to Synced Note",
      prefBtnSyncPull: "Reload from Library",
      prefBtnExport: "Export JSON",
      prefBtnImport: "Import JSON",

      // Status messages
      statusSaved: "Settings saved.",
      statusSavedSynced: "Rules saved and synced to the library.",
      statusSavedLocalErr: "Saved locally (error syncing note: {err})",
      statusSavedLocal: "Rules saved locally.",
      statusColsUpdated: "List updated ({count} collections).",
      statusNoPairsFound: "No thematic pairs ('By Axis & Theme' / 'Por Eixo e Tema') found.",
      statusPairsFound: "{count} pair(s) auto-detected!",
      statusSelectSource: "Select a source collection.",
      statusTargetPrepErr: "Error preparing destination subcollection: {err}",
      statusSameFolder: "Source and destination collections must be different.",
      statusDuplicateRule: "This folder rule already exists.",
      statusTestingAI: "Testing connection…",
      statusAIOk: "Connection OK ({provider} / {model})!",
      statusAIFail: "Failed: {err}",
      statusLoadedFromLib: "Loaded from library ({count} rule(s)).",
      statusNoSyncNote: "No synced configuration note found in the library.",
      statusLoadErr: "Error loading: {err}",
      statusExportOk: "Configuration exported successfully (without API keys).",
      statusExportErr: "Error exporting: {err}",
      statusImportOk: "Configuration imported ({count} rule(s))!",
      statusImportErr: "Error importing: {err}",
      statusApiUnavailable: "Organizer API unavailable. Please re-enable the plugin.",
      statusInitErr: "Error loading preferences pane: {err}",
      filePickerExportTitle: "Export Organizer Configuration",
      filePickerImportTitle: "Import Organizer Configuration",

      // Plan Dialog
      planWindowTitle: "Organizer — Organization Plan by Axis",
      planTitleFmt: "Organize “{source}” ({count} pending)",
      planSubtitle:
        'Review, create manual indices, or adjust axes below. When you click "Run Organization", this window stays open until every item is verified in Zotero.',
      planDestExistingLabel: "Using existing thematic subcollection:",
      planDestNewLabel: "Create subcollection inside “{source}”:",
      planBadgeExisting: "Existing",
      planBadgeNewSub: "New subcollection",
      planBadgeNewFolder: "New folder",
      planBadgeManual: "Manual",
      planBadgeAI: "AI + Keywords ({provider})",
      planBadgeOffline: "Offline Mode",
      planBtnReAI: "Re-analyze with AI",
      planBtnReOffline: "Re-analyze Offline",
      planManualLabel: "Create manual index/axis:",
      planManualPlaceholder: "E.g.: 01 - Primary Sources, Korean History, Methodology…",
      planBtnAddManual: "+ Create Index",
      planSearchPlaceholder: "Filter axes or item titles…",
      planBtnSelectAll: "Select all",
      planBtnUnselectAll: "Deselect all",
      planEmptyGroups:
        "No axes yet. Use the box above to create a manual index or click Re-analyze.",
      planItemCount: "{count} item(s)",
      planBtnAssign: "+ Assign items",
      planBtnCloseAssign: "Close picker",
      planBtnViewItems: "View items ▾",
      planBtnHideItems: "Hide ▴",
      planPickerPlaceholder: "Search books/articles to assign to this index…",
      planManualEmptyHint:
        'Empty manual index — click "+ Assign items" or "Re-analyze" to populate it, or execute as-is to create the ready folder.',
      planAxisEmptyHint: "No items in this axis.",
      planItemRmTitle:
        "Remove from this axis in the plan (use '+ Assign items' on another axis to add it there)",
      planReanalyzingAI: "Analyzing collection with AI + keyword cross-check… please wait.",
      planReanalyzingOff: "Recalculating offline plan…",
      planReanalyzeErr: "Error re-analyzing: {err}",
      planSummaryFmt: "{axes} axis/axes • {items} unique item(s) ({links} link(s)){newPart} — nothing will be deleted",
      planSummaryNewPart: " • {count} new folder(s)",
      planSummaryNone: "No axis selected",
      planBtnCancel: "Cancel",
      planBtnExecute: "Run Organization",
      planBtnExecuteCount: "Run Organization ({count} items)",
      planBtnExecuting: "Running & verifying…",
      planBtnDoneClose: "Done & Close",
      planBtnRetryMissing: "Retry missing items",
      planExecStart: "Starting folder creation and indexing in Zotero…",
      planExecWarn:
        "Warning: {verified}/{total} items verified ({missing} pending verification).",
      planExecMissingLine: "• {title} — missing in: {cols}",
      planExecMoreMissing: "… and {count} more item(s).",
      planExecOk:
        "Verified in Zotero: {verified}/{total} item(s) confirmed in the planned subcollections!",
      planExecCreatedPart: "{count} folder(s) created",
      planExecReusedPart: "existing folders reused",
      planExecDetailsOk:
        "Destination: {dest} • {vLinks}/{tLinks} real links confirmed in Zotero DB • {created} • Real-time monitoring enabled.",
      planExecErr: "Error during execution: {err}",
      planExecErrSafe: "No items or folders were deleted. You can safely try again.",
      planAxisNameTitle: "You can rename this axis before executing",

      // Classify Dialog (single item)
      clsWindowTitle: "Organizer — Classify Item",
      clsBatchProgress: "   •   Item {index} of {total}",
      clsSearchPlaceholder: "Filter axes or themes…",
      clsBtnReAI: "Re-analyze with AI",
      clsBtnReOff: "Re-analyze Offline",
      clsEmptyTree:
        "This destination tree has no subcollections yet. Use the box below to create the first axis/theme.",
      clsPillSuggested: "Suggested",
      clsNewTitle: "Create new subcollection / theme (optional)",
      clsNewPlaceholder: "E.g.: 9.3 Environmental History (or new axis)",
      clsBtnAddNew: "+ Add",
      clsNewRootOpt: "New root axis ({root})",
      clsNewInsideOpt: "Inside: {eixo}",
      clsNewChipFmt: 'New folder: "{name}" in [{parent}]',
      clsRootParentFmt: "Root ({root})",
      clsBtnAbort: "Cancel Batch",
      clsBtnSkip: "Skip",
      clsBtnConfirm: "Confirm & Link",
      clsSummarySelected: "Selected: {parts}",
      clsSummaryExisting: "{count} existing",
      clsSummaryNew: "{count} new folder(s)",
      clsSummaryNone: "No theme selected",
      clsReanalyzingAI: "Querying AI + keywords…",
      clsReanalyzingOff: "Recalculating offline similarity…",
      clsNoTitle: "(Untitled)",

      // Main controller & toasts
      toastOrganizedTitle: "Organizer — Item organized",
      toastLinkedLine: "Linked in {root} → {names}{created}",
      toastNewFolderSuffix: " (new folder: {names})",
      toastNoChangeTitle: "Organizer — No changes",
      toastNoChangeFallback:
        "No matching theme found (right-click the item to classify manually).",
      toastSelectCollection: "Select a collection in the left pane first.",
      toastIsTargetRoot1: "“{name}” is already a destination thematic subcollection.",
      toastIsTargetRoot2:
        "Run 'Organize by Axis & Theme' on the main source folder (e.g. Books or My Library).",
      toastAllOrganized: "All items in “{source}” are already organized in “{dest}”!",
      toastNoDirectItems: "Collection “{source}” has no direct books/articles to organize.",
      toastNoValidTitle: "No items with a valid title found in “{source}”.",
      toastPlanningTitle: "Organizer — Building plan",
      toastPlanningAI: "Analyzing {count} item(s) in “{source}” with AI + keywords…",
      toastPlanningOff: "Analyzing {count} item(s) in “{source}” (offline mode)…",
      toastPlanErrTitle: "Organizer — Error building plan",
      toastWarnTitle: "Organizer — Notice",
      toastErrTitle: "Organizer — Error",
      toastSelectItem: "Select at least one book, article, or PDF.",
      toastNoRulesOpening: "No managed folders configured yet. Opening settings…",
      toastSyncedLoaded: "Synced configuration loaded ({count} folder rule(s)).",
      toastAutoDiscovered:
        "No synced note found; {count} pair(s) auto-detected locally.",
      toastNoSyncedYet: "No synced configuration found in the library yet.",
      progPrepTarget: "Preparing destination thematic subcollection…",
      progCreatingAxes: "Creating/validating {count} axis/axes…",
      progPreparingAxis: "Preparing axis {idx}/{total}: {name}",
      progIndexingItems: "Indexing items ({done}/{total})…",
      progVerifyingDB: "Verifying actual indexing in Zotero database…",
      progRetryingMissing: "Retrying {count} pending item(s) after verification…",
      progDone: "Verification complete!",

      // Classifier messages
      clsReasonEmptyDisabled:
        "Destination collection is empty and automatic subcollection creation is disabled.",
      clsReasonEmptySeed:
        'Offline mode (empty destination): suggested axis from terms such as "{terms}".',
      clsReasonEmptyInitial: 'Offline mode (empty destination): creating initial axis "{name}".',
      clsReasonOfflineMatch:
        'Offline mode (text similarity): matching terms such as "{terms}".',
      clsReasonOfflineNewSeed:
        'Offline mode: suggested new axis from terms such as "{terms}".',
      clsReasonOfflineTopicMatch: 'Offline mode: topic match with "{terms}".',
      clsReasonOfflineFallbackExisting:
        'Offline mode: low similarity — routed to "{name}".',
      clsReasonOfflineFallbackNew:
        'Offline mode: low similarity — suggesting folder "{name}".',
      clsReasonOfflineLow:
        "Offline mode: low match with current themes — select manually or create a new theme.",
      clsReasonAIHybrid: "Classified via AI + keyword cross-check.",
      clsReasonFallbackAI: "Offline fallback (AI unavailable: {err}). {base}",
      clsReasonHybridNoKey:
        "Offline mode active (configure an AI API key for semantic + keyword cross-check). {base}",
      clsPlanOffExisting:
        "Plan built in Offline Mode: {exist} existing axis/axes reused{newPart}.",
      clsPlanOffNewPart: " + {count} new axis/axes suggested",
      clsPlanOffInitial:
        "Initial plan built in Offline Mode: {count} thematic axis/axes suggested for {items} item(s).",
      clsPlanAI:
        "AI ({provider}) + keyword cross-check: {axes} axis/axes for {items} item(s){extra}.",
      clsPlanAIReconciled: " (+ {count} reconciled via keywords)",
      generalAxisName: "General & Other Topics",
    },
  };

  function detectZoteroLocale() {
    try {
      const loc =
        (typeof Zotero !== "undefined" && Zotero.locale) ||
        (typeof navigator !== "undefined" && navigator.language) ||
        "en-US";
      return String(loc).toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";
    } catch (e) {
      return "en-US";
    }
  }

  function getStoredLanguagePref() {
    try {
      if (typeof Zotero !== "undefined" && Zotero.Prefs) {
        const v = Zotero.Prefs.get("extensions.eixosOrganizer.language", true);
        if (v === "pt-BR" || v === "en-US" || v === "auto") return v;
      }
    } catch (e) {}
    return "auto";
  }

  function getLocale(overridePref) {
    const pref = overridePref || getStoredLanguagePref();
    if (pref === "pt-BR" || pref === "en-US") return pref;
    return detectZoteroLocale();
  }

  function t(key, params, overridePref) {
    const loc = getLocale(overridePref);
    const dict = STRINGS[loc] || STRINGS["en-US"];
    let str =
      Object.prototype.hasOwnProperty.call(dict, key)
        ? dict[key]
        : STRINGS["en-US"][key] || key;
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        str = str.split(`{${k}}`).join(v === undefined || v === null ? "" : String(v));
      }
    }
    return str;
  }

  return {
    getLocale,
    getStoredLanguagePref,
    detectZoteroLocale,
    t,
  };
})();

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/README-English-2563eb?style=for-the-badge" alt="README (EN)" /></a>
  <a href="README.pt-BR.md"><img src="https://img.shields.io/badge/README-Portugu%C3%AAs%20(PT--BR)-16a34a?style=for-the-badge" alt="README (PT-BR)" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-475569?style=for-the-badge" alt="MIT License" /></a>
</p>

# Organizer — Plugin para Zotero (Zotero 7 / 8 / 10)

> **v1.5.1 — Versão Estável Pública (Cofre Criptografado para Chave de API)**

Plugin **100% não-destrutivo** para o Zotero que organiza automaticamente livros, artigos, teses e PDFs em **subcoleções numeradas por Eixo e Tema** — com motor **híbrido (cruzamento IA + palavras-chave + fallback offline)**, **tela única de revisão do plano com verificação real no banco do Zotero**, **seletor completo de idioma (Português / Inglês)** nas configurações e **compartilhamento opcional de regras via Zotero Sync / WebDAV**.

---

## Sumário

- [Visão geral](#visão-geral)
- [Garantias de segurança](#garantias-de-segurança)
- [Instalação no Zotero](#instalação-no-zotero)
- [Primeiros passos](#primeiros-passos)
- [Seleção de idioma (Português / Inglês)](#seleção-de-idioma-português--inglês)
- [Motor híbrido: IA + Palavras-chave + Offline](#motor-híbrido-ia--palavras-chave--offline)
- [Compartilhamento com equipe (Zotero Sync / WebDAV)](#compartilhamento-com-equipe-zotero-sync--webdav)
- [Menus e atalhos disponíveis](#menus-e-atalhos-disponíveis)
- [Arquitetura do projeto](#arquitetura-do-projeto)
- [Compilação e desenvolvimento](#compilação-e-desenvolvimento)
- [Histórico de versões](#histórico-de-versões)
- [Solução de problemas](#solução-de-problemas)
- [Licença](#licença)

---

## Visão geral

Quando você mantém coleções gerais no Zotero (por exemplo, `Livros`, `Artigos e Teses` ou `Minha biblioteca`), o **Organizer** cria e mantém automaticamente uma árvore temática paralela (`<Coleção> - Por Eixo e Tema` em português ou `<Collection> - By Axis & Theme` em inglês):

1. **Plano completo em 1 única tela:** clique com o botão direito em qualquer coleção → **Organizer: Organizar por Eixo e Tema (Ver Plano)…**. O plugin analisa todos os itens pendentes em memória e exibe o plano inteiro com eixos numerados (`01 - Tema`, `02 - Tema`, …). Você pode renomear eixos, marcar/desmarcar grupos, **criar índices manuais**, atribuir ou remover itens e reanalisar com IA ou Offline antes de alterar qualquer coisa no Zotero.
2. **Execução com verificação real no banco:** ao clicar em **Executar Organização**, a janela permanece aberta exibindo o progresso ao vivo, cria/reutiliza a subcoleção temática e os eixos, vincula cada item e **consulta diretamente o banco do Zotero (`collectionItems`) para confirmar cada vínculo** (com retentativa automática de pendências) antes de liberar **Concluir e Fechar**.
3. **Sem precisar criar pasta vazia antes:** se a coleção já possuir uma subcoleção temática (interna ou irmã no padrão `<Nome> - Por Eixo e Tema` / `<Name> - By Axis & Theme`), o Organizer parte dela automaticamente; caso contrário, cria `<Nome da Coleção> - Por Eixo e Tema` dentro dela ao executar.
4. **Tempo real automático com notificação:** uma vez que a pasta está gerenciada, ao arrastar ou salvar qualquer novo livro, artigo, tese ou PDF nela, o plugin resolve os metadados completos do item pai, anexa nos eixos correspondentes e mostra uma notificação informando exatamente onde o item foi anexado.
5. **Respeita sua organização manual:** se você já colocou um item diretamente dentro de um eixo/subcoleção temática, o Organizer reconhece que o trabalho já foi feito e não mexe nele.
6. **Classificação interdisciplinar:** um mesmo item pode pertencer a múltiplos temas (até o limite configurável, padrão `3`), mantendo sempre um único registro e um único arquivo PDF/EPUB no Zotero.

---

## Garantias de segurança

- **Zero exclusões:** o plugin **nunca** apaga itens, anexos, notas ou coleções.
- **Pasta original intacta:** vincular um livro a eixos temáticos **nunca remove** o item da coleção de origem (`Livros`, `Artigos e Teses`, etc.).
- **Sem duplicação de arquivos:** no Zotero, coleções funcionam como marcadores/playlists. Vincular um PDF a 2 ou 3 temas **nunca duplica** o arquivo no disco nem no WebDAV.
- **Chave de API criptografada localmente:** chaves de IA (Gemini, OpenAI, etc.) **nunca** ficam em texto puro no `prefs.js`, **nunca** sobem para o Git, **nunca** são exportadas para JSON, **nunca** vão para a nota sincronizada da biblioteca e **nunca** trafegam na URL nem aparecem em logs de erro. A chave é criptografada localmente usando o cofre nativo **NSS Secret Decoder Ring (`key4.db`)** do Zotero/Gecko, com fallback automático para **WebCrypto AES-256-GCM**. Chaves salvas em versões anteriores (`v1.0`–`v1.5.0`) são migradas para o cofre criptografado e apagadas em texto puro automaticamente na inicialização.

---

## Instalação no Zotero

Compatível com **Zotero 7, 8 e 10** (`strict_min_version: 7.0`, `strict_max_version: 10.*`).

1. Baixe **`organizer-v1.5.1.xpi`** em [GitHub Releases](https://github.com/Fjalarr/Zotero-Organizer/releases/latest) ou na pasta [`dist/organizer-v1.5.1.xpi`](dist/organizer-v1.5.1.xpi).
2. No Zotero, abra **Ferramentas → Plugins** (*Tools → Plugins*).
3. Clique no ícone de **engrenagem** no canto superior direito e escolha **Instalar plugin a partir de arquivo…** (*Install Plugin From File…*).
4. Selecione o arquivo **`organizer-v1.5.1.xpi`**.

O plugin entra em operação imediatamente (sem precisar reiniciar o Zotero). Quem já usava o `Eixos Organizer v1.x` mantém automaticamente todas as regras, preferências e chaves de API configuradas.

---

## Primeiros passos

### Opção A — Organizar qualquer coleção em 1 passo (Recomendado)
1. Clique com o botão direito em qualquer coleção no painel esquerdo do Zotero (ex.: `Livros` ou `Minha biblioteca`).
2. Escolha **Organizer: Organizar por Eixo e Tema (Ver Plano)…**.
3. Revise os eixos numerados sugeridos, crie índices manuais se desejar com **Criar índice/eixo manualmente** e **+ Atribuir itens**, e clique em **Executar Organização**.
4. Aguarde a confirmação verde de verificação no banco do Zotero e clique em **Concluir e Fechar**. O monitoramento automático em tempo real já fica ativado!

### Opção B — Configurar pastas e preferências
Abra **Editar → Configurações → Organizer** (ou **Ferramentas → Organizer → Configurar Pastas Gerenciadas e IA…**) para:
- Escolher o idioma do plugin (**Automático**, **Português (Brasil)** ou **English**).
- Clicar em **Detectar Automaticamente** para registrar pares existentes `<Pasta> → <Pasta> - Por Eixo e Tema` (ou `By Axis & Theme`).
- Adicionar, ativar, pausar ou remover regras de pastas gerenciadas.
- Escolher entre modo **Automático com notificação** (padrão) ou **Interativo** ao adicionar 1 item novo.

---

## Seleção de idioma (Português / Inglês)

A partir da **`v1.5.0`**, o **Organizer** é totalmente bilíngue (**Português (Brasil)** e **Inglês**):

1. Abra **Editar → Configurações → Organizer**.
2. Na seção **Idioma / Language** logo no topo, selecione:
   - **Automático (seguir idioma do Zotero)** — acompanha automaticamente o idioma da interface do Zotero;
   - **Português (Brasil)** — traduz toda a interface, janelas, notificações, sufixo padrão (`<Pasta> - Por Eixo e Tema`), vocabulário offline e prompts da IA para português;
   - **English** — alterna toda a interface, janelas, notificações, sufixo padrão (`<Folder> - By Axis & Theme`), vocabulário offline e prompts da IA para inglês.
3. A aba de Configurações muda de idioma **na hora, sem precisar reiniciar o Zotero**.

---

## Motor híbrido: IA + Palavras-chave + Offline

Configurável em **Editar → Configurações → Organizer → 3. Motor de Classificação**:

| Modo | Como funciona |
|---|---|
| **Híbrido (padrão)** | Roda primeiro a análise local por palavras-chave/TF-IDF e envia tanto os **metadados completos do item pai** (título, autores, ano, editora, revista, série, DOI, ISBN, tags, resumo e nomes de arquivos anexados) quanto os candidatos locais para a API de IA, que cruza as duas análises, corrige falsos positivos e reconcilia qualquer item omitido. Cai automaticamente para Offline se não houver chave de API ou internet. |
| **Somente IA** | Exige um provedor de IA configurado (mantendo o cruzamento com palavras-chave para máxima acurácia). |
| **Somente Offline** | Zero chamadas externas: calcula similaridade **TF-IDF** local frente aos eixos existentes ou gera automaticamente eixos temáticos iniciais numerados a partir de vocabulário acadêmico multilíngue (PT/EN/ES) e tags quando a pasta destino está vazia. |

### Provedores de IA suportados
- **Google Gemini (AI Studio):** modelo padrão `gemini-3.5-flash` (compatível com `gemini-2.5-flash`, `gemini-3-flash-preview`, etc., com `thinkingConfig` de baixa latência e filtro automático de blocos de raciocínio interno). Gere sua chave em [Google AI Studio](https://aistudio.google.com/apikey).
- **OpenAI:** modelo padrão `gpt-4o-mini`.
- **Ollama / Endpoint compatível com OpenAI:** ideal para modelos 100% locais (ex.: `http://localhost:11434/v1/chat/completions` com `llama3.1`).

Use o botão **Testar Conexão com IA** nas configurações para validar a chave e o nome do modelo antes de começar.

---

## Compartilhamento com equipe (Zotero Sync / WebDAV)

1. Envie o arquivo `organizer-v1.5.0.xpi` para quem usa a mesma biblioteca Zotero / WebDAV.
2. As subcoleções criadas, os vínculos dos livros/artigos e os arquivos PDF/EPUB já sincronizam **nativamente** pelo Zotero Sync / WebDAV.
3. Opcionalmente, ative a **Seção 4 — Sincronizar Regras do Plugin** para compartilhar apenas a lista de pastas monitoradas em uma nota interna da biblioteca (tag `_eixos_organizer_config`, sem nunca armazenar chaves de API).
4. A opção **Não mexer em itens que eu já coloquei diretamente em algum eixo/tema da subcoleção** vem ativada por padrão para evitar reclassificações após o sync entre computadores.
5. Para levar as regras para outra conta Zotero separada, use **Exportar JSON** / **Importar JSON** (sem chaves de API).

---

## Menus e atalhos disponíveis

- **Menu superior (`Ferramentas → Organizer`):**
  - *Configurar Pastas Gerenciadas e IA…*
  - *Organizar Coleção Atual por Eixo e Tema (Ver Plano)…*
  - *Recarregar Configuração Sincronizada da Biblioteca*
- **Menu de contexto de itens (botão direito em 1 ou mais livros/artigos/PDFs):**
  - *Organizer: Classificar por Eixo e Tema…*
- **Menu de contexto de coleções (botão direito em uma pasta):**
  - *Organizer: Gerenciar esta coleção…*
  - *Organizer: Organizar por Eixo e Tema (Ver Plano)…*

---

## Arquitetura do projeto

```text
Zotero-Organizer/
├── manifest.json                     # Metadados do plugin (Zotero 7–10, Organizer v1.5.0)
├── updates.json                      # Manifesto de atualizações (update_url)
├── chrome.manifest                   # Registro de conteúdo e idiomas (pt-BR / en-US)
├── bootstrap.js                      # Ciclo de vida do plugin (startup / shutdown / registerChrome)
├── src/
│   ├── i18n.js                       # Motor de internacionalização PT-BR / EN em tempo real
│   ├── crypto.js                     # Cofre criptografado local (NSS key4.db + AES-256-GCM) e sanitização de logs
│   ├── config.js                     # Preferências locais, migração criptografada, nota sincronizada e JSON
│   ├── organizer.js                  # Árvore não-destrutiva, resolução do item pai e verificação DB
│   ├── classifier.js                 # Motor híbrido (cruzamento IA + palavras-chave + TF-IDF)
│   └── main.js                       # Observer em tempo real, fila com retentativa, menus e planos
├── chrome/content/
│   ├── icon.svg                      # Ícone adaptável (modo claro e escuro)
│   ├── preferences.xhtml / .js / .css     # Painel nativo com seletor de idioma ao vivo
│   ├── plan-dialog.xhtml / .js / .css     # Tela única não-modal de plano e execução verificada
│   └── classify-dialog.xhtml / .js / .css # Janela interativa para item individual
├── locale/
│   ├── pt-BR/eixos-organizer.ftl     # Tradução Fluent dos menus em Português (Brasil)
│   └── en-US/eixos-organizer.ftl     # Tradução Fluent dos menus em Inglês
├── build.py                          # Empacotador Python (gera dist/organizer-v<versão>.xpi e limpa versões antigas de dist/)
├── README.md                         # Documentação em Inglês
├── README.pt-BR.md                   # Documentação em Português (Brasil)
└── dist/
    └── organizer-v1.5.1.xpi          # Build estável atual pronta para instalação no Zotero
```

> **Nota sobre `dist/`:** a partir da `v1.5.0`, a pasta `dist/` mantém apenas o pacote `.xpi` da versão atual para manter o repositório enxuto. Todas as builds antigas (`v1.0.0` – `v1.4.2`) continuam arquivadas e disponíveis para download em [GitHub Releases](https://github.com/Fjalarr/Zotero-Organizer/releases).

---

## Compilação e desenvolvimento

Pré-requisitos: **Python 3** (e opcionalmente **Node.js** para validação de sintaxe).

```powershell
# Empacotar a versão definida em manifest.json -> dist/organizer-v<versão>.xpi (remove .xpi antigos de dist/)
python build.py
```

Validação rápida de sintaxe de todos os scripts:

### Fluxo de Branches, Atualização Automática e Releases

- **`dev` (Branch de desenvolvimento):** todas as alterações, correções e Pull Requests **devem ir primeiro para `dev`**. Ao rodar `python build.py`, o script gera `dist/organizer-v<versão>.xpi` e atualiza automaticamente o `updates.json` com a nova versão, link da release e hash criptográfico **SHA-256 (`update_hash`)**.
- **`main` (Branch protegida de produção):** só recebe código via Pull Request de **`dev` → `main`** após revisão e aprovação do mantenedor.
- **Atualização automática no Zotero:** sempre que um PR é aprovado e mesclado na `main`, o GitHub Actions (`.github/workflows/auto-release.yml`) valida os scripts e o hash SHA-256 e publica automaticamente a Release **`v<versão> — Organizer`** com o `.xpi` anexado. Os Zoteros que já têm o plugin instalado consultam `updates.json` na `main` via `update_url`, verificam o SHA-256 e **atualizam automaticamente** (ou imediatamente em **Ferramentas → Plugins → ⚙️ → Verificar atualizações**).

```powershell
node --check bootstrap.js
node --check src/i18n.js
node --check src/crypto.js
node --check src/config.js
node --check src/organizer.js
node --check src/classifier.js
node --check src/main.js
node --check chrome/content/preferences.js
node --check chrome/content/plan-dialog.js
node --check chrome/content/classify-dialog.js
```

---

## Histórico de versões

Todas as versões possuem rastreio completo por commit, tag Git e [GitHub Releases](https://github.com/Fjalarr/Zotero-Organizer/releases):

| Versão | Data | Release / Commit | Pacote `.xpi` | Resumo da evolução |
|---|---|---|---|---|
| **`v1.5.1`** *(estável)* | 26/11/2026 | [`v1.5.1`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.5.1) | `dist/organizer-v1.5.1.xpi` | **Cofre criptografado local para Chave de API**: criptografia local via **NSS (`key4.db`)** do Zotero/Gecko com fallback **AES-256-GCM**, migração e limpeza automática da preferência legada em texto puro, envio da chave Gemini no header `x-goog-api-key`, sanitização de segredos em logs de erro, botão **Limpar Chave**, `.gitignore` reforçado e fluxo **`dev` → PR → `main`** |
| **`v1.5.0`** | 26/11/2026 | [`v1.5.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.5.0) (`66358b3`) | *GitHub Release* | **Primeira versão estável pública**: renomeado para **Organizer**, seletor de idioma **Português (Brasil) / English / Automático** nas configurações (interface, janelas, notificações, vocabulário offline e IA), documentação bilíngue (`README.md` + `README.pt-BR.md`) e `dist/` enxuta apenas com a build atual |
| **`v1.4.2`** | 26/11/2026 | [`v1.4.2`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.4.2) (`1712f85`) | *GitHub Release* | Correção do deadlock modal na execução do plano (`openDialog` não-modal + progresso ao vivo), correção visual de textos sobrepostos na lista de itens e numeração sequencial sem lacunas |
| **`v1.4.1`** | 26/11/2026 | [`v1.4.1`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.4.1) (`e6b4480`) | *GitHub Release* | Numeração automática padronizada (`01 - Tema`, `02 - Tema` e `N.M Subtema`) em eixos gerados offline, pela IA ou criados manualmente no plano |
| **`v1.4.0`** | 26/11/2026 | [`v1.4.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.4.0) (`5ae20b5`) | *GitHub Release* | Cruzamento IA + palavras-chave, metadados completos do item pai (DOI/ISBN/editora/série), API mais rápida (`thinkingConfig` + chunks paralelos), entrega garantida com retentativa, criação manual de índices no plano e verificação real no banco antes de fechar a janela |
| **`v1.3.0`** | 26/11/2026 | [`v1.3.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.3.0) (`852b664`, `45d3123`) | *GitHub Release* | Plano completo em 1 única tela antes de executar, criação/reuso automático de `<Mãe> - Por Eixo e Tema` sem pasta vazia manual, tempo real automático com notificação e respeito à organização manual |
| **`v1.2.0`** | 26/11/2026 | [`v1.2.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.2.0) (`e94fe5b`) | *GitHub Release* | Botão `X` / `Esc` / `Cancelar Lote` encerra lote imediatamente; motor offline cria eixos iniciais automaticamente em pastas destino vazias |
| **`v1.1.0`** | 26/11/2026 | [`v1.1.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.1.0) (`24b80ef`) | *GitHub Release* | Correção de instalação no Zotero 10.0.8 (`update_url` + `registerChrome`), correção do escopo `Cu.Sandbox` nos botões de Configurações, autoria **Daniel Barreto** e builds versionadas |
| **`v1.0.0`** | 26/11/2026 | [`v1.0.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.0.0) (`831f957`) | *GitHub Release* | Lançamento inicial do `Eixos Organizer` (motor híbrido IA + offline, janela interativa, preferências e menus) |

### Detalhes de cada versão

#### `v1.5.1` — `organizer-v1.5.1.xpi` *(estável atual)*
- **Armazenamento criptografado da Chave de API (`src/crypto.js`):** chaves de API agora são criptografadas antes de serem gravadas no computador usando o cofre nativo **NSS Secret Decoder Ring (`key4.db`)** do Zotero/Gecko, com fallback automático para **WebCrypto AES-256-GCM** (chave aleatória de 256 bits isolada em arquivo próprio no perfil do Zotero, fora do `prefs.js`).
- **Migração e remoção automática de texto puro:** qualquer chave salva nas versões `v1.0`–`v1.5.0` é criptografada automaticamente e removida da preferência legada `extensions.eixosOrganizer.aiApiKey` assim que o plugin inicia.
- **Zero vazamento em URL ou logs:** chamadas ao Gemini passam a enviar a chave no cabeçalho oficial `x-goog-api-key` (em vez de `?key=` na URL), e todos os erros passam por `sanitizeErrorText()` para nunca expor chaves ou tokens em notificações ou logs do Zotero.
- **Indicador de cofre e botão Limpar Chave:** a aba **Editar → Configurações → Organizer** mostra o status de criptografia local (`🔒 Salva criptografada localmente`) e inclui o botão **Limpar Chave** para remover a chave do cofre com 1 clique.
- **Segurança de repositório e governança:** `.gitignore` reforçado contra arquivos de chaves/segredos, template de PR (`.github/pull_request_template.md`), criação da branch `dev` e fluxo **`dev` → Pull Request → aprovação → `main`**.

#### `v1.5.0` *(arquivada no GitHub Releases)*
- **Projeto renomeado para Organizer:** identidade unificada no manifesto, aba de Configurações, janelas, notificações, menus e pacote `.xpi` (`organizer-v1.5.0.xpi`), mantendo o identificador interno (`eixos-organizer@danielbarreto.local`) para atualização direta sem perda de regras ou configurações das versões `1.x`.
- **Suporte completo a Português (Brasil) e Inglês:** novo módulo `src/i18n.js` e seletor **Idioma / Language** no topo de **Editar → Configurações → Organizer** (`Automático`, `Português (Brasil)` ou `English`). A troca altera a tela de configurações ao vivo (sem reiniciar o Zotero) e adapta janelas, notificações, nome padrão da subcoleção destino (`<Pasta> - Por Eixo e Tema` vs. `<Folder> - By Axis & Theme`), vocabulário offline e idioma das respostas da IA.
- **Documentação bilíngue:** criação do [`README.md`](README.md) completo em inglês e do [`README.pt-BR.md`](README.pt-BR.md) em português com rastreio de todas as versões.
- **Limpeza da pasta `dist/`:** `build.py` agora gera `dist/organizer-v<versão>.xpi` e remove automaticamente builds antigas da pasta `dist/` (que permanecem preservadas nos Releases do GitHub).

#### `v1.4.2` *(arquivada no GitHub Releases)*
- Alterada a janela `plan-dialog.xhtml` para **não-modal** (`openDialog` sem `modal`), eliminando o deadlock com `saveTx()` no Gecko 140 e mostrando progresso ao vivo de cada eixo criado, item indexado e verificação final no banco.
- Removidos os menus `<select>` embutidos dentro da lista rolável de itens (eliminando a sobreposição de textos no Gecko 140) e aplicado truncamento limpo com reticências e tooltip (`title`).
- Numeração sequencial contínua sem lacunas (`01`, `02`, `03`…) nos eixos sugeridos pela IA.

#### `v1.4.1` *(arquivada no GitHub Releases)*
- Numeração automática padronizada (`01 - Tema`, `02 - Tema` e `N.M Subtema`) em eixos offline, IA e índices manuais do plano, com deduplicação que ignora o prefixo numérico.

#### `v1.4.0` *(arquivada no GitHub Releases)*
- Cruzamento IA + palavras-chave (o motor offline envia seus candidatos à IA para validar acertos, corrigir falsos positivos e reconciliar itens omitidos).
- Resolução automática de anexos/notas para o **item pai** com metadados completos (`DOI`, `ISBN`, `ISSN`, editora, local, série, revista, tipo de tese, tags, resumo e nomes de arquivos).
- Chamadas Gemini muito mais rápidas (`thinkingConfig` por geração, filtro de blocos `thought`, prompts compactos, chunks paralelos e retentativa automática em erros transitórios).
- Entrega garantida em tempo real com até 3 retentativas enquanto o Zotero baixa metadados do PDF.
- Criação manual de índices e botão **+ Atribuir itens** diretamente no plano (desde a 1ª análise).
- Verificação real na tabela `collectionItems` do Zotero antes de fechar a janela do plano.

#### `v1.3.0` *(arquivada no GitHub Releases)*
- Plano completo em 1 única tela (`plan-dialog.xhtml`) antes de criar ou alterar qualquer pasta.
- Reuso automático de subcoleções temáticas existentes ou criação automática de `<Mãe> - Por Eixo e Tema` dentro da coleção de origem sem precisar criar pasta vazia manualmente.
- Tempo real automático com notificação clara e respeito aos itens colocados manualmente pelo usuário.

#### `v1.2.0` *(arquivada no GitHub Releases)*
- Fechar `classify-dialog` pelo `X`, `Esc` ou **Cancelar Lote** interrompe o lote imediatamente sem reabrir para o próximo item.
- Motor offline cria eixos iniciais automaticamente em pastas destino vazias em vez de pular tudo com `0 vinculados`.

#### `v1.1.0` *(arquivada no GitHub Releases)*
- Compatibilidade com Zotero 10.0.8 (`applications.zotero.update_url` + `updates.json` + `amIAddonManagerStartup.registerChrome`).
- Correção do escopo `Cu.Sandbox` em `preferences.js` (botões e listas de Configurações).
- Autoria atualizada para **Daniel Barreto** (`eixos-organizer@danielbarreto.local`).

#### `v1.0.0` *(arquivada no GitHub Releases)*
- Lançamento inicial do `Eixos Organizer` (motor híbrido IA + offline, janela interativa, painel de preferências, menus e garantia 100% não-destrutiva).

---

## Solução de problemas

- **O plugin não aparece após instalar:** confira em *Ferramentas → Plugins* se **Organizer** está ativado e se sua versão do Zotero está entre `7.0` e `10.*`.
- **Um novo item não foi organizado automaticamente:** verifique em *Editar → Configurações → Organizer* se a coleção de origem está listada e marcada como ativa. Se o item já estiver dentro de algum eixo da árvore destino, clique com o botão direito no item → *Organizer: Classificar por Eixo e Tema…* para reclassificar manualmente.
- **Erro ao consultar a IA:** clique em *Testar Conexão com IA* nas configurações para ver a mensagem exata do provedor (chave, nome do modelo, cota ou endpoint). No modo **Híbrido**, o Organizer continua funcionando em modo Offline caso a IA esteja indisponível.

---

## Licença

Distribuído sob a licença [MIT](LICENSE) — © 2026 Daniel Barreto.

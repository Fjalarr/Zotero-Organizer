# Eixos Organizer — Plugin para Zotero (7 / 8 / 10)

Plugin **100% não-destrutivo** para o Zotero que organiza automaticamente livros, artigos, teses e PDFs em **subcoleções por Eixo e Tema** — com motor **híbrido (IA + modo offline)**, janela interativa de confirmação e **compartilhamento de configuração entre usuários da mesma biblioteca / WebDAV**.

---

## Sumário

- [Visão geral](#visão-geral)
- [Garantias de segurança](#garantias-de-segurança)
- [Instalação no Zotero](#instalação-no-zotero)
- [Primeiros passos](#primeiros-passos)
- [Motor híbrido: IA + Modo Offline](#motor-híbrido-ia--modo-offline)
- [Compartilhamento com equipe (Zotero Sync / WebDAV)](#compartilhamento-com-equipe-zotero-sync--webdav)
- [Menus e atalhos disponíveis](#menus-e-atalhos-disponíveis)
- [Arquitetura do projeto](#arquitetura-do-projeto)
- [Compilação e desenvolvimento](#compilação-e-desenvolvimento)
- [Histórico de versões](#histórico-de-versões)
- [Solução de problemas](#solução-de-problemas)

---

## Visão geral

Quando você mantém coleções gerais no Zotero (por exemplo, `Livros` ou `Artigos e Teses`) junto com árvores paralelas organizadas por **Eixos e Temas** (como `Livros - Por Eixo e Tema` ou `Artigos e Teses - Por Eixo e Tema`), o **Eixos Organizer** automatiza a classificação de cada novo item:

1. **Monitoramento em tempo real:** ao arrastar ou salvar um novo livro, artigo, tese ou PDF em uma coleção monitorada, o plugin analisa os metadados (título, autores, ano, resumo, revista/editora e tags) frente à árvore real de eixos e temas existente.
2. **Janela interativa (ou modo automático):** por padrão, abre uma janela limpa com os temas sugeridos já marcados para você confirmar em 1 clique, ajustar livremente ou **criar uma nova subcoleção/eixo** caso surja um tema inédito. Se preferir, pode alternar nas preferências para **modo 100% automático em segundo plano**.
3. **Classificação interdisciplinar:** um mesmo item pode ser vinculado a múltiplos temas (até o limite configurável, padrão `3`), mantendo sempre um único registro e um único arquivo PDF/EPUB no Zotero.
4. **Gerenciamento flexível de pastas:** você escolhe livremente quais coleções de origem mapeiam para quais árvores temáticas de destino — tudo pela interface do Zotero, sem editar código.

---

## Garantias de segurança

- **Zero exclusões:** o plugin **nunca** chama métodos de remoção ou exclusão de itens, anexos ou coleções.
- **Pasta original intacta:** vincular um livro a novas subcoleções temáticas **não remove** o item da coleção de origem (`Livros`, `Artigos e Teses`, etc.).
- **Arquivo único:** no Zotero, coleções funcionam como marcadores/playlists. Colocar um livro em 2 ou 3 temas **não duplica** o PDF/EPUB no disco nem no WebDAV.
- **Chaves de API sempre locais:** se você configurar uma chave de IA (Gemini ou OpenAI), ela fica gravada exclusivamente nas preferências locais daquele computador e **nunca** é escrita na nota sincronizada da biblioteca nem incluída em exportações JSON.

---

## Instalação no Zotero

Compatível com **Zotero 7, 8 e 10** (`strict_min_version: 7.0`, `strict_max_version: 10.*`).

1. Baixe o arquivo da versão mais recente em **Releases** ou na pasta `dist/` deste repositório (ex.: `dist/zotero-eixos-organizer-v1.3.0.xpi`).
2. No Zotero, abra **Ferramentas → Plugins** (*Tools → Plugins*).
3. Clique no ícone de **engrenagem** no canto superior direito e escolha **Instalar plugin a partir de arquivo…** (*Install Plugin From File…*).
4. Selecione o arquivo `.xpi` da versão desejada (ex.: `zotero-eixos-organizer-v1.3.0.xpi`).

O plugin entra em operação imediatamente (sem precisar reiniciar o Zotero).

---

## Primeiros passos

### 1. Detecção automática de pastas
Na primeira inicialização, se ainda não houver regras salvas, o plugin verifica automaticamente pares no padrão:

- `<Nome da Coleção>` → `<Nome da Coleção> - Por Eixo e Tema`

Por exemplo:
- `Daniel / Livros` → `Daniel / Livros - Por Eixo e Tema`
- `Daniel / Artigos e Teses` → `Daniel / Artigos e Teses - Por Eixo e Tema`

### 2. Gerenciar qualquer outra coleção
Você pode adicionar, ativar, pausar ou remover regras a qualquer momento:
- Vá em **Editar → Configurações → Eixos Organizer** (ou **Ferramentas → Eixos Organizer → Configurar Pastas Gerenciadas e IA…**); ou
- Clique com o **botão direito em qualquer coleção** na barra lateral do Zotero → **Eixos Organizer: Gerenciar esta coleção…**.

---

## Motor híbrido: IA + Modo Offline

O plugin opera em três modos selecionáveis nas configurações:

| Modo | Como funciona |
|---|---|
| **Híbrido (padrão)** | Usa IA se houver provedor configurado; caso contrário (ou se estiver sem internet), aplica automaticamente o classificador offline por similaridade textual. |
| **Somente IA** | Usa exclusivamente o provedor de IA configurado (ideal para classificação semântica profunda e sugestão automática de novos temas/eixos). |
| **Somente Offline** | Não faz nenhuma chamada externa: calcula similaridade **TF-IDF** comparando título, resumo, autores e tags do item novo com os nomes das pastas e obras já existentes em cada tema. |

### Provedores de IA suportados
Em **Editar → Configurações → Eixos Organizer → 3. Motor de Classificação**:

- **Google Gemini (AI Studio):** modelo padrão `gemini-2.5-flash`. Basta gerar uma API key em [Google AI Studio](https://aistudio.google.com/apikey) e colar no campo *Chave de API*.
- **OpenAI:** modelo padrão `gpt-4o-mini`.
- **Ollama / Endpoint compatível com OpenAI:** ideal para modelos 100% locais (ex.: `http://localhost:11434/v1/chat/completions` com `llama3.1` ou similar).

Use o botão **Testar Conexão com IA** para validar a configuração antes de começar.

---

## Compartilhamento com equipe (Zotero Sync / WebDAV)

Para que outras pessoas que usam o mesmo Zotero/WebDAV aproveitem a mesma automação:

1. Envie o arquivo `.xpi` da versão atual (ex.: `zotero-eixos-organizer-v1.3.0.xpi`) para a pessoa instalar no Zotero dela.
2. As subcoleções criadas, os vínculos dos livros/artigos e os arquivos PDF/EPUB já são sincronizados **nativamente** pelo Zotero Sync / WebDAV.
3. Opcionalmente, o plugin também pode sincronizar apenas a **lista de pastas monitoradas** em uma nota interna da biblioteca (tag `_eixos_organizer_config`, título `[Eixos Organizer] Configuração Sincronizada (não apagar)`), para que outros computadores herdem regras personalizadas automaticamente (sem nunca salvar chaves de API).
4. Para evitar reclassificações após o sync entre computadores, a opção **Ignorar itens que já estejam vinculados a algum eixo/tema da árvore destino** vem ativada por padrão.
5. Caso queira compartilhar as regras com alguém que usa outra conta Zotero separada, use **Exportar JSON** e **Importar JSON** na seção 4 das configurações.

---

## Menus e atalhos disponíveis

- **Menu superior (`Ferramentas → Eixos Organizer`):**
  - *Configurar Pastas Gerenciadas e IA…*
  - *Classificar Itens Pendentes da Coleção Atual*
  - *Recarregar Configuração Sincronizada da Biblioteca*
- **Menu de contexto de itens (botão direito em 1 ou mais livros/artigos):**
  - *Eixos Organizer: Classificar por Eixo e Tema…*
- **Menu de contexto de coleções (botão direito em uma pasta):**
  - *Eixos Organizer: Gerenciar esta coleção…*
  - *Eixos Organizer: Classificar pendentes desta coleção*

---

## Arquitetura do projeto

```text
zotero-eixos-organizer/
├── manifest.json                     # Metadados do plugin (Zotero 7–10)
├── updates.json                      # Manifesto de atualizações (update_url)
├── chrome.manifest                   # Registro de conteúdo e traduções (pt-BR / en-US)
├── bootstrap.js                      # Ciclo de vida do plugin (startup / shutdown / registerChrome)
├── src/
│   ├── config.js                     # Preferências locais, nota sincronizada, auto-detecção e JSON
│   ├── organizer.js                  # Leitura da árvore temática e vinculação não-destrutiva
│   ├── classifier.js                 # Motor híbrido (Gemini / OpenAI / Ollama + TF-IDF offline)
│   └── main.js                       # Observer (collection-item), fila/debounce, menus e fluxos
├── chrome/content/
│   ├── icon.svg                      # Ícone adaptável (modo claro e escuro)
│   ├── preferences.xhtml / .js / .css     # Painel nativo em Editar → Configurações
│   ├── plan-dialog.xhtml / .js / .css     # Tela única de revisão e execução do plano em lote
│   └── classify-dialog.xhtml / .js / .css # Janela interativa de confirmação para item individual
├── locale/
│   ├── pt-BR/eixos-organizer.ftl     # Tradução em Português (Brasil)
│   └── en-US/eixos-organizer.ftl     # Tradução em Inglês
├── build.py                          # Empacotador Python (gera dist/zotero-eixos-organizer-v<versão>.xpi sem apagar antigas)
└── dist/
    ├── zotero-eixos-organizer-v1.0.0.xpi # Build histórica v1.0.0 (arquivada)
    ├── zotero-eixos-organizer-v1.1.0.xpi # Build histórica v1.1.0 (arquivada)
    ├── zotero-eixos-organizer-v1.2.0.xpi # Build histórica v1.2.0 (arquivada)
    └── zotero-eixos-organizer-v1.3.0.xpi # Build atual v1.3.0 pronta para instalação no Zotero
```

---

## Compilação e desenvolvimento

Pré-requisitos: **Python 3** (e opcionalmente **Node.js** para checagem de sintaxe).

```powershell
# Empacotar a versão definida em manifest.json (gera dist/zotero-eixos-organizer-v<versão>.xpi mantendo as anteriores)
python build.py
```

Para validar rapidamente a sintaxe de todos os scripts após alterações:

```powershell
node --check bootstrap.js
node --check src/config.js
node --check src/organizer.js
node --check src/classifier.js
node --check src/main.js
node --check chrome/content/preferences.js
node --check chrome/content/classify-dialog.js
```

---

## Histórico de versões

Todas as builds `.xpi` geradas ficam preservadas em `dist/` com o número da versão no nome do arquivo (novas compilações nunca apagam as builds anteriores), com rastreabilidade completa por commit, tag Git e Release no GitHub:

| Versão | Data | Tag / Commit | Build `.xpi` | Resumo da evolução |
|---|---|---|---|---|
| **`v1.3.0`** *(atual)* | 26/11/2026 | [`v1.3.0`](https://github.com/Fjalarr/zotero-eixos-organizer/releases/tag/v1.3.0) | `dist/zotero-eixos-organizer-v1.3.0.xpi` | Plano completo em 1 única tela antes de executar, criação/reuso automático de subcoleção temática sem pasta vazia manual, tempo real automático com notificação e respeito à organização manual |
| **`v1.2.0`** | 26/11/2026 | [`v1.2.0`](https://github.com/Fjalarr/zotero-eixos-organizer/releases/tag/v1.2.0) (`e94fe5b`) | `dist/zotero-eixos-organizer-v1.2.0.xpi` | Botão `X` / `Esc` / `Cancelar Lote` encerra lote imediatamente; motor offline cria eixos iniciais automaticamente em pastas destino vazias |
| **`v1.1.0`** | 26/11/2026 | [`v1.1.0`](https://github.com/Fjalarr/zotero-eixos-organizer/releases/tag/v1.1.0) (`24b80ef`) | `dist/zotero-eixos-organizer-v1.1.0.xpi` | Correção de instalação no Zotero 10.0.8 (`update_url` + `registerChrome`), correção do escopo `Cu.Sandbox` nos botões de Configurações, autoria **Daniel Barreto** e builds versionadas |
| **`v1.0.0`** | 26/11/2026 | [`v1.0.0`](https://github.com/Fjalarr/zotero-eixos-organizer/releases/tag/v1.0.0) (`831f957`) | `dist/zotero-eixos-organizer-v1.0.0.xpi` | Lançamento inicial do plugin (motor híbrido IA + offline, janela interativa, preferências e menus) |

### `v1.3.0` — `dist/zotero-eixos-organizer-v1.3.0.xpi` *(atual)*
- **Organização em lote em 1 única tela (`plan-dialog.xhtml`):** ao clicar com o botão direito em qualquer coleção → **Organizar por Eixo e Tema (Ver Plano)…**, o plugin analisa todos os itens pendentes em memória e exibe **um único plano completo** com todos os eixos sugeridos (permitindo marcar/desmarcar, renomear eixos e expandir para ver os itens de cada eixo). Nada é criado nem alterado até você clicar em **Executar Organização**.
- **Sem precisar criar pasta vazia antes:** se a coleção ainda não tiver subcoleção temática, o plugin cria automaticamente `Por Eixo e Tema` (nome editável no plano) **dentro dela** ao executar e ativa o monitoramento automático; se já existir uma subcoleção temática (aninhada dentro dela ou irmã no padrão `<Nome> - Por Eixo e Tema`, como `Livros - Por Eixo e Tema`), o plugin parte dela automaticamente.
- **Detecção automática ampliada:** agora reconhece tanto subcoleções irmãs (`Livros → Livros - Por Eixo e Tema`) quanto subcoleções internas (`Minha biblioteca → Minha biblioteca / Por Eixo e Tema`).
- **Tempo real automático com notificação (novo padrão):** ao jogar um item novo em uma pasta monitorada (ex.: `Livros`), o plugin já vincula no(s) eixo(s) correspondente(s) e exibe uma notificação clara indicando exatamente em qual pasta e eixo o item foi anexado.
- **Respeito à organização manual:** se você colocar um item diretamente dentro de um eixo/subcoleção temática, o plugin reconhece que o trabalho já foi feito e não faz nada.

### `v1.2.0` — `dist/zotero-eixos-organizer-v1.2.0.xpi` *(arquivada)*
- **Fechar janela (`X` / `Esc`) cancela o lote imediatamente:** corrigido o comportamento da janela interativa em lotes — clicar no **`X`** da janela, pressionar **`Esc`** ou clicar no novo botão **Cancelar Lote** interrompe o processamento imediatamente sem reabrir para os itens seguintes; o botão **Pular** continua pulando apenas o item atual. A janela também passa a exibir o progresso (`Item X de Y`).
- **Modo Offline inteligente mesmo em pastas destino vazias:** quando a coleção destino ainda não possui subcoleções (ou quando um item não casa com os temas atuais) e a criação de novas pastas está ativada, o motor offline passa a criar/sugerir automaticamente eixos temáticos iniciais (a partir de um vocabulário acadêmico PT/EN/ES e tags do item, reutilizando os eixos criados nos itens seguintes do lote) em vez de pular tudo com `0 vinculados`.
- **Avisos mais claros em lote:** alerta imediato se a pasta destino estiver vazia com criação de subcoleções desativada, e contagem de novas pastas criadas no resumo final do lote.

### `v1.1.0` — `dist/zotero-eixos-organizer-v1.1.0.xpi` *(arquivada)*
- **Compatibilidade real com Zotero 10.0.8:** adicionado `applications.zotero.update_url` obrigatório no `manifest.json` + arquivo `updates.json` (corrigindo o erro de instalação *"Pode ser incompatível com esta versão do Zotero"*).
- **Registro explícito de `chrome://`:** `bootstrap.js` agora aguarda `Zotero.initializationPromise` e registra `chrome://eixos-organizer/content/` via `amIAddonManagerStartup.registerChrome` (com limpeza no `shutdown`).
- **Correção completa do painel de Configurações:** corrigido o isolamento de escopo (`Cu.Sandbox`) do Zotero 10 que impedia `EixosPrefsPane.init()` de rodar — listas suspensas de coleções e todos os botões (Detectar Automaticamente, Atualizar Listas, Adicionar Pasta Gerenciada, Testar Conexão com IA, etc.) agora inicializam corretamente.
- **Melhorias de interface:** feedback de status exibido diretamente na Seção 1, remoção da barra de rolagem horizontal (`preferences.css`) e texto mais claro na Seção 4 explicando que pastas/PDFs já sincronizam nativamente via Zotero/WebDAV e que a seção é opcional apenas para sincronizar regras do plugin.
- **Autoria e identificador:** autor atualizado para **Daniel Barreto** (`eixos-organizer@danielbarreto.local`, `LICENSE` atualizada).
- **Builds versionadas:** `build.py` passou a ler a versão de `manifest.json` e gerar `dist/zotero-eixos-organizer-v<versão>.xpi` preservando todas as builds anteriores.

### `v1.0.0` — `dist/zotero-eixos-organizer-v1.0.0.xpi` *(arquivada)*
- Lançamento inicial do **Eixos Organizer**: estrutura completa do plugin para Zotero 7–10, motor híbrido (IA Gemini / OpenAI / Ollama + fallback offline TF-IDF), janela interativa de classificação com criação de novos eixos/temas, painel de preferências, menus no Zotero e garantia 100% não-destrutiva.
- *Nota:* não instalava no Zotero 10.0.8 devido à ausência de `applications.zotero.update_url` no `manifest.json` (corrigido a partir da `v1.1.0`).

---

## Solução de problemas

- **O plugin não aparece após instalar:** confira em *Ferramentas → Plugins* se **Eixos Organizer** está ativado e se sua versão do Zotero está entre `7.0` e `10.*`.
- **A janela interativa não abriu ao arrastar um item:** verifique em *Editar → Configurações → Eixos Organizer* se a coleção de origem está listada e marcada como ativa, e se o item já não estava vinculado a algum tema da árvore destino (nesse caso, use o clique direito no item → *Eixos Organizer: Classificar por Eixo e Tema…* para forçar a reclassificação).
- **Erro ao consultar a IA:** clique em *Testar Conexão com IA* nas preferências para ver a mensagem exata do provedor (chave inválida, cota ou endpoint). No modo **Híbrido**, o plugin continua funcionando via fallback offline mesmo se a IA estiver indisponível.

---

## Licença

Distribuído sob a licença [MIT](LICENSE).

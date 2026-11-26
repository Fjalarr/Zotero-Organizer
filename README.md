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

1. Baixe o arquivo `zotero-eixos-organizer.xpi` em **Releases** (ou na pasta `dist/zotero-eixos-organizer.xpi` deste repositório).
2. No Zotero, abra **Ferramentas → Plugins** (*Tools → Plugins*).
3. Clique no ícone de **engrenagem** no canto superior direito e escolha **Instalar plugin a partir de arquivo…** (*Install Plugin From File…*).
4. Selecione `zotero-eixos-organizer.xpi`.

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

1. Envie o arquivo `zotero-eixos-organizer.xpi` para a pessoa instalar no Zotero dela.
2. Por padrão, o plugin mantém o mapeamento de pastas gerenciadas em uma nota sincronizada na própria biblioteca (tag `_eixos_organizer_config`, título `[Eixos Organizer] Configuração Sincronizada (não apagar)`).
3. Quando outra pessoa sincroniza a biblioteca e ativa o plugin, ela **herda automaticamente** a lista de pastas monitoradas.
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
├── chrome.manifest                   # Registro de conteúdo e traduções (pt-BR / en-US)
├── bootstrap.js                      # Ciclo de vida do plugin (startup / shutdown / window hooks)
├── src/
│   ├── config.js                     # Preferências locais, nota sincronizada, auto-detecção e JSON
│   ├── organizer.js                  # Leitura da árvore temática e vinculação não-destrutiva
│   ├── classifier.js                 # Motor híbrido (Gemini / OpenAI / Ollama + TF-IDF offline)
│   └── main.js                       # Observer (collection-item), fila/debounce, menus e fluxos
├── chrome/content/
│   ├── icon.svg                      # Ícone adaptável (modo claro e escuro)
│   ├── preferences.xhtml / .js / .css     # Painel nativo em Editar → Configurações
│   └── classify-dialog.xhtml / .js / .css # Janela interativa de confirmação e criação de temas
├── locale/
│   ├── pt-BR/eixos-organizer.ftl     # Tradução em Português (Brasil)
│   └── en-US/eixos-organizer.ftl     # Tradução em Inglês
├── build.py                          # Empacotador Python para gerar o .xpi
└── dist/
    └── zotero-eixos-organizer.xpi    # Pacote pronto para instalação no Zotero
```

---

## Compilação e desenvolvimento

Pré-requisitos: **Python 3** (e opcionalmente **Node.js** para checagem de sintaxe).

```powershell
# Reempacotar o arquivo dist/zotero-eixos-organizer.xpi
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

## Solução de problemas

- **O plugin não aparece após instalar:** confira em *Ferramentas → Plugins* se **Eixos Organizer** está ativado e se sua versão do Zotero está entre `7.0` e `10.*`.
- **A janela interativa não abriu ao arrastar um item:** verifique em *Editar → Configurações → Eixos Organizer* se a coleção de origem está listada e marcada como ativa, e se o item já não estava vinculado a algum tema da árvore destino (nesse caso, use o clique direito no item → *Eixos Organizer: Classificar por Eixo e Tema…* para forçar a reclassificação).
- **Erro ao consultar a IA:** clique em *Testar Conexão com IA* nas preferências para ver a mensagem exata do provedor (chave inválida, cota ou endpoint). No modo **Híbrido**, o plugin continua funcionando via fallback offline mesmo se a IA estiver indisponível.

---

## Licença

Distribuído sob a licença [MIT](LICENSE).

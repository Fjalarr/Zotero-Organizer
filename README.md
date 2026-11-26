# Eixos Organizer — Plugin para Zotero (7 / 8 / 10)

Plugin **100% não-destrutivo** para o Zotero que organiza automaticamente livros, artigos, teses e PDFs em **subcoleções por Eixo e Tema** — com motor **híbrido (IA + modo offline)**, janela interativa de confirmação e **compartilhamento opcional de regras entre usuários da mesma biblioteca / WebDAV**.

## Histórico de versões

### `v1.1.0` — `dist/zotero-eixos-organizer-v1.1.0.xpi` *(atual)*
- **Compatibilidade real com Zotero 10.0.8:** adicionado `applications.zotero.update_url` obrigatório no `manifest.json` + arquivo `updates.json` (corrigindo o erro de instalação *"Pode ser incompatível com esta versão do Zotero"*).
- **Registro explícito de `chrome://`:** `bootstrap.js` agora aguarda `Zotero.initializationPromise` e registra `chrome://eixos-organizer/content/` via `amIAddonManagerStartup.registerChrome`.
- **Correção completa do painel de Configurações:** corrigido o isolamento de escopo (`Cu.Sandbox`) do Zotero 10 que impedia `EixosPrefsPane.init()` de inicializar os menus suspensos e botões.
- **Melhorias de interface:** feedback visual direto na Seção 1, correção de largura/overflow horizontal (`preferences.css`) e texto mais claro na Seção 4 sobre o que o Zotero/WebDAV já sincroniza nativamente.
- **Autoria e identificador:** autor atualizado para **Daniel Barreto** (`eixos-organizer@danielbarreto.local`, `LICENSE` atualizada).
- **Builds versionadas:** `build.py` passou a ler a versão de `manifest.json` e gerar `dist/zotero-eixos-organizer-v<versão>.xpi` preservando todas as builds anteriores.

### `v1.0.0` — `dist/zotero-eixos-organizer-v1.0.0.xpi` *(arquivada)*
- Lançamento inicial do **Eixos Organizer**: estrutura completa do plugin para Zotero 7–10, motor híbrido (IA + fallback offline TF-IDF), janela interativa de classificação, painel de preferências e menus no Zotero.

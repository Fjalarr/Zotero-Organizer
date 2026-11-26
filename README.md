# Eixos Organizer — Plugin para Zotero (7 / 8 / 10)

Plugin **100% não-destrutivo** para o Zotero que organiza automaticamente livros, artigos, teses e PDFs em **subcoleções por Eixo e Tema** — com motor **híbrido (IA + modo offline)**, janela interativa de confirmação e **compartilhamento opcional de regras entre usuários da mesma biblioteca / WebDAV**.

## Histórico de versões

### `v1.2.0` — `dist/zotero-eixos-organizer-v1.2.0.xpi` *(atual)*
- **Fechar janela (`X` / `Esc`) cancela o lote imediatamente:** corrigido o comportamento da janela interativa em lotes — clicar no **`X`** da janela, pressionar **`Esc`** ou clicar em **Cancelar Lote** interrompe o processamento imediatamente sem reabrir para os itens seguintes; **Pular** continua pulando apenas o item atual. A janela passa a exibir o progresso (`Item X de Y`).
- **Modo Offline inteligente em pastas destino vazias:** quando a coleção destino ainda não possui subcoleções (ou quando um item não casa com os temas atuais) e a criação de novas pastas está ativada, o motor offline cria/sugere automaticamente eixos temáticos iniciais a partir de um vocabulário acadêmico PT/EN/ES e das tags do item, reutilizando os eixos criados nos itens seguintes do lote.
- **Avisos mais claros em lote:** alerta imediato se a pasta destino estiver vazia com criação de subcoleções desativada e contagem de novas pastas criadas no resumo final.

### `v1.1.0` — `dist/zotero-eixos-organizer-v1.1.0.xpi` *(arquivada)*
- Compatibilidade real com Zotero 10.0.8 (`update_url` + `updates.json`), registro explícito de `chrome://` via `amIAddonManagerStartup.registerChrome`, correção do escopo `Cu.Sandbox` nas preferências, autoria atualizada para **Daniel Barreto** e builds versionadas em `dist/`.

### `v1.0.0` — `dist/zotero-eixos-organizer-v1.0.0.xpi` *(arquivada)*
- Lançamento inicial do **Eixos Organizer** (`v1.0.0`).

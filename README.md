<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/README-English-2563eb?style=for-the-badge" alt="README (EN)" /></a>
  <a href="README.pt-BR.md"><img src="https://img.shields.io/badge/README-Portugu%C3%AAs%20(PT--BR)-16a34a?style=for-the-badge" alt="README (PT-BR)" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-475569?style=for-the-badge" alt="MIT License" /></a>
</p>

# Organizer — Zotero Plugin (Zotero 7 / 8 / 10)

> **v1.5.1 — Stable Public Release (Encrypted Local API Key Vault)**

A **100% non-destructive** Zotero plugin that automatically organizes books, articles, theses, and PDFs into **numbered thematic subcollections by Axis & Theme** — powered by a **Hybrid Engine (AI + local keyword cross-check + offline fallback)**, a **single-screen interactive Plan Preview with live Zotero database verification**, **full English / Portuguese (PT-BR) language switching**, and optional **team rule sync via Zotero Sync / WebDAV**.

---

## Table of Contents

- [Overview](#overview)
- [Safety Guarantees](#safety-guarantees)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Language Selection (English / Português)](#language-selection-english--português)
- [Hybrid Engine: AI + Keyword Cross-Check + Offline](#hybrid-engine-ai--keyword-cross-check--offline)
- [Team Sharing (Zotero Sync / WebDAV)](#team-sharing-zotero-sync--webdav)
- [Menus & Shortcuts](#menus--shortcuts)
- [Project Architecture](#project-architecture)
- [Development & Build](#development--build)
- [Version History](#version-history)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

When you maintain general collections in Zotero (such as `Books`, `Articles & Theses`, or `My Library`), **Organizer** builds and maintains a parallel thematic tree (`<Collection> - By Axis & Theme` in English or `<Coleção> - Por Eixo e Tema` in Portuguese) automatically:

1. **Single-Screen Batch Plan Preview:** right-click any collection → **Organizer: Organize by Axis & Theme (Preview Plan)…**. Organizer analyzes all pending items in memory and shows one unified plan with numbered axes (`01 - Topic`, `02 - Topic`, …). You can rename axes, check/uncheck groups, **create manual indices**, assign or remove items, and re-analyze with AI or Offline before touching anything in Zotero.
2. **Verified Live Execution:** when you click **Run Organization**, the plan window stays open with live progress, creates/reuses the thematic subcollection and axes, links every item, and **queries Zotero's database (`collectionItems`) to verify every single link** (retrying any pending link automatically) before enabling **Done & Close**.
3. **Automatic Subcollection Creation or Reuse:** no need to manually create an empty folder first. If a thematic subcollection already exists (either nested inside the collection or as a sibling `<Name> - By Axis & Theme` / `<Nome> - Por Eixo e Tema`), Organizer starts from it automatically; otherwise it creates `<Parent> - By Axis & Theme` inside the collection on execution.
4. **Real-Time Auto-Organization + Notifications:** once a collection is managed, dragging or saving any new book, article, thesis, or PDF into it automatically resolves the parent item's full metadata, links it to the best matching axis/axes, and displays a notification showing exactly where it was placed.
5. **Respects Manual Organization:** if you place an item directly inside a thematic axis yourself, Organizer recognizes it is already categorized and leaves it untouched.
6. **Interdisciplinary Multi-Linking:** a single work can belong to multiple themes (up to a configurable limit, default `3`) while keeping a single database record and a single PDF/EPUB file.

---

## Safety Guarantees

- **Zero deletions:** the plugin **never** deletes items, attachments, notes, or collections.
- **Original folder untouched:** linking an item to thematic axes **never removes** it from its source collection (`Books`, `Articles`, etc.).
- **No duplicate files:** Zotero collections work like smart labels/playlists. Linking one PDF to 2 or 3 thematic axes **never duplicates** the file on disk or on WebDAV.
- **Encrypted local API key vault:** AI API keys (Gemini, OpenAI, etc.) are **never** stored in plaintext in `prefs.js`, **never** committed to Git, **never** exported to JSON, **never** written to synced library notes, and **never** passed in URL query strings or printed in error logs. Keys are encrypted locally using Zotero/Gecko's native **NSS Secret Decoder Ring (`key4.db`)** with an automatic **WebCrypto AES-256-GCM** fallback. Legacy plaintext keys from `v1.0`–`v1.5.0` are migrated and wiped automatically on first startup.

---

## Installation

Compatible with **Zotero 7, 8, and 10** (`strict_min_version: 7.0`, `strict_max_version: 10.*`).

1. Download **`organizer-v1.5.1.xpi`** from [GitHub Releases](https://github.com/Fjalarr/Zotero-Organizer/releases/latest) or from [`dist/organizer-v1.5.1.xpi`](dist/organizer-v1.5.1.xpi).
2. In Zotero, open **Tools → Plugins** (*Ferramentas → Plugins*).
3. Click the **gear icon** in the top-right corner and choose **Install Plugin From File…** (*Instalar plugin a partir de arquivo…*).
4. Select **`organizer-v1.5.1.xpi`**.

The plugin activates immediately without restarting Zotero. Users upgrading from `Eixos Organizer v1.x` keep all existing managed-folder rules, settings, and API keys automatically.

---

## Quick Start

### Option A — Organize any collection in 1 step (Recommended)
1. Right-click any collection in Zotero's left pane (e.g. `Books` or `My Library`).
2. Click **Organizer: Organize by Axis & Theme (Preview Plan)…**.
3. Review the suggested numbered axes, optionally add your own manual indices with **Create manual index/axis** and **+ Assign items**, then click **Run Organization**.
4. Wait for the green Zotero database verification check, then click **Done & Close**. Real-time monitoring is now enabled for that collection!

### Option B — Configure folders and settings
Open **Edit → Settings → Organizer** (or **Tools → Organizer → Configure Managed Folders & AI…**) to:
- Switch the plugin language (**Auto**, **English**, or **Português (Brasil)**).
- Click **Auto-Detect** to automatically register existing `<Collection> → <Collection> - By Axis & Theme` (or `Por Eixo e Tema`) pairs.
- Add, pause, inspect, or remove managed folder rules.
- Choose between **Automatic with notification** (default) or **Interactive** mode for newly added single items.

---

## Language Selection (English / Português)

Starting in **`v1.5.0`**, **Organizer** is fully bilingual (**English** and **Português (Brasil)**):

1. Open **Edit → Settings → Organizer**.
2. In the **Language / Idioma** section at the top, choose:
   - **Auto (follow Zotero language)** — automatically follows Zotero's interface locale;
   - **English** — switches preferences, dialogs, notifications, default root suffix (`<Folder> - By Axis & Theme`), offline topic seeds, and AI axis/reason prompts to English;
   - **Português (Brasil)** — switches everything to Brazilian Portuguese (`<Pasta> - Por Eixo e Tema`, Portuguese topic seeds, and PT-BR AI prompts).
3. The Settings panel switches languages **immediately without restarting Zotero**.

---

## Hybrid Engine: AI + Keyword Cross-Check + Offline

Selectable in **Edit → Settings → Organizer → 3. Classification Engine**:

| Mode | How it works |
|---|---|
| **Hybrid (default)** | Runs local keyword/TF-IDF analysis first, then sends both **full parent-item metadata** (title, authors, year, publisher, journal, series, DOI, ISBN, tags, abstract, attachment filenames) and local keyword candidates to the AI so the model cross-checks agreements, fixes keyword false positives, and reconciles any omitted items. Automatically falls back to Offline mode if no API key is configured or offline. |
| **AI Only** | Requires a configured AI provider (still performs keyword cross-checking for maximum accuracy). |
| **Offline Only** | Zero external API calls: computes local **TF-IDF** similarity against existing axes/items, or automatically creates numbered starter thematic axes from a built-in multilingual academic vocabulary (EN/PT/ES) and item tags when the destination is empty. |

### Supported AI Providers
- **Google Gemini (AI Studio):** default model `gemini-3.5-flash` (supports `gemini-2.5-flash`, `gemini-3-flash-preview`, etc. with automatic low-latency `thinkingConfig` and thought-part filtering). Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey).
- **OpenAI:** default model `gpt-4o-mini`.
- **Ollama / OpenAI-Compatible Endpoint:** ideal for 100% local LLMs (e.g. `http://localhost:11434/v1/chat/completions` with `llama3.1`).

Use **Test AI Connection** in Settings to verify your provider and model name before organizing.

---

## Team Sharing (Zotero Sync / WebDAV)

1. Share `organizer-v1.5.0.xpi` with teammates using the same Zotero library / WebDAV.
2. Created subcollections, item links, and PDFs/EPUBs sync **natively** via Zotero Sync / WebDAV.
3. Optionally enable **Section 4 — Sync Plugin Rules** to share only the list of monitored folders in an internal library note (tag `_eixos_organizer_config`, never containing API keys).
4. **Do not touch items I already placed directly inside a thematic axis** is enabled by default to avoid redundant re-classification across synced computers.
5. To transfer rules to a completely separate Zotero account, use **Export JSON** / **Import JSON** (API keys are never exported).

---

## Menus & Shortcuts

- **Top Menu (`Tools → Organizer`):**
  - *Configure Managed Folders & AI…*
  - *Organize Current Collection by Axis & Theme (Preview Plan)…*
  - *Reload Synced Library Configuration*
- **Item Context Menu (right-click 1 or more items/PDFs):**
  - *Organizer: Classify by Axis & Theme…*
- **Collection Context Menu (right-click any collection):**
  - *Organizer: Manage this collection…*
  - *Organizer: Organize by Axis & Theme (Preview Plan)…*

---

## Project Architecture

```text
Zotero-Organizer/
├── manifest.json                     # Add-on metadata (Zotero 7–10, Organizer v1.5.0)
├── updates.json                      # Self-hosted update manifest (update_url)
├── chrome.manifest                   # Content & locale registration (en-US / pt-BR)
├── bootstrap.js                      # Plugin lifecycle (startup / shutdown / registerChrome)
├── src/
│   ├── i18n.js                       # Full runtime EN / PT-BR localization engine
│   ├── crypto.js                     # Encrypted local API key vault (NSS key4.db + AES-256-GCM) & log sanitizer
│   ├── config.js                     # Local prefs, encrypted key migration, synced note & JSON I/O
│   ├── organizer.js                  # Non-destructive tree reader, parent resolver & DB verifier
│   ├── classifier.js                 # Hybrid AI + keyword cross-check + offline TF-IDF engine
│   └── main.js                       # Real-time observer, retry queue, menus & plan controller
├── chrome/content/
│   ├── icon.svg                      # Adaptive light/dark icon
│   ├── preferences.xhtml / .js / .css     # Native Settings pane with live Language selector
│   ├── plan-dialog.xhtml / .js / .css     # Non-modal single-screen Plan Preview & verified execution
│   └── classify-dialog.xhtml / .js / .css # Single-item interactive classification dialog
├── locale/
│   ├── en-US/eixos-organizer.ftl     # English Fluent menu strings
│   └── pt-BR/eixos-organizer.ftl     # Portuguese (Brazil) Fluent menu strings
├── build.py                          # Python packager (builds dist/organizer-v<version>.xpi and cleans old .xpi files)
├── README.md                         # English documentation
├── README.pt-BR.md                   # Portuguese (Brazil) documentation
└── dist/
    └── organizer-v1.5.1.xpi          # Current stable build ready for Zotero installation
```

> **Note on `dist/`:** Starting with `v1.5.0`, `dist/` keeps only the latest stable `.xpi` package to keep the repository lightweight. All historical `.xpi` builds (`v1.0.0` – `v1.4.2`) remain archived and downloadable in [GitHub Releases](https://github.com/Fjalarr/Zotero-Organizer/releases).

---

## Development & Build

Prerequisites: **Python 3** (and optionally **Node.js** for syntax checks).

```powershell
# Package the version defined in manifest.json -> dist/organizer-v<version>.xpi (removes older .xpi files in dist/)
python build.py
```

Quick syntax check for all scripts:

### Branching & Release Workflow

- **`dev` (Development branch):** all new features, bug fixes, and community Pull Requests **must target `dev` first**.
- **`main` (Protected Release branch):** updated exclusively via Pull Request from **`dev` → `main`** after maintainer review and approval, ensuring every public release is verified before distribution.

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

## Version History

Every release is tracked via Git tags and [GitHub Releases](https://github.com/Fjalarr/Zotero-Organizer/releases):

| Version | Date | Release / Commit | Package `.xpi` | Summary |
|---|---|---|---|---|
| **`v1.5.1`** *(stable)* | 2026-11-26 | [`v1.5.1`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.5.1) | `dist/organizer-v1.5.1.xpi` | **Encrypted local API key vault**: encrypts AI API keys locally via Zotero/Gecko **NSS (`key4.db`)** with **AES-256-GCM** fallback, auto-migrates & wipes legacy plaintext prefs, moves Gemini API key to `x-goog-api-key` HTTP header, sanitizes secrets from error logs, adds **Clear Key** button & vault badge, strengthens `.gitignore`, and establishes the **`dev` → PR → `main`** workflow |
| **`v1.5.0`** | 2026-11-26 | [`v1.5.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.5.0) (`66358b3`) | *GitHub Release* | **First stable public release**: renamed to **Organizer**, full live **English / Portuguese (PT-BR)** language switcher in Settings (UI, dialogs, notifications, offline seeds & AI prompts), bilingual `README.md` + `README.pt-BR.md`, and clean `dist/` keeping only the current build |
| **`v1.4.2`** | 2026-11-26 | [`v1.4.2`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.4.2) (`1712f85`) | *GitHub Release* | Fixed modal `saveTx()` deadlock during plan execution (switched `plan-dialog` to non-modal with live progress), fixed Gecko `<select>` text overlap in expanded item lists, and eliminated numbering gaps |
| **`v1.4.1`** | 2026-11-26 | [`v1.4.1`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.4.1) (`e6b4480`) | *GitHub Release* | Standardized sequential numbering (`01 - Topic`, `02 - Topic`, and `N.M Subtopic`) across offline, AI, and manual plan axes with prefix-aware deduplication |
| **`v1.4.0`** | 2026-11-26 | [`v1.4.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.4.0) (`5ae20b5`) | *GitHub Release* | Hybrid AI + keyword cross-check, full parent-item metadata resolution (DOI/ISBN/publisher/series), faster Gemini calls (`thinkingConfig` + parallel chunks), reliable retry delivery, manual indices inside Plan Preview, and live Zotero DB verification before closing |
| **`v1.3.0`** | 2026-11-26 | [`v1.3.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.3.0) (`852b664`, `45d3123`) | *GitHub Release* | Single-screen Batch Plan Preview (`plan-dialog`), automatic creation/reuse of `<Parent> - Por Eixo e Tema` without manual empty folders, real-time auto-linking with notifications, and respect for manually placed items |
| **`v1.2.0`** | 2026-11-26 | [`v1.2.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.2.0) (`e94fe5b`) | *GitHub Release* | Window `X` / `Esc` / `Cancel Batch` aborts batch immediately without reopening; offline engine auto-creates starter thematic axes on empty destination folders |
| **`v1.1.0`** | 2026-11-26 | [`v1.1.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.1.0) (`24b80ef`) | *GitHub Release* | Zotero 10.0.8 install compatibility (`applications.zotero.update_url` + `updates.json` + `registerChrome`), fixed Zotero 10 `Cu.Sandbox` scope bug in Preferences, updated author to **Daniel Barreto**, and versioned builds |
| **`v1.0.0`** | 2026-11-26 | [`v1.0.0`](https://github.com/Fjalarr/Zotero-Organizer/releases/tag/v1.0.0) (`831f957`) | *GitHub Release* | Initial release of `Eixos Organizer` (hybrid AI + offline engine, interactive single-item dialog, preferences pane, menus, and 100% non-destructive design) |

### Detailed Release Notes

#### `v1.5.1` — `organizer-v1.5.1.xpi` *(current stable)*
- **Encrypted Local API Key Storage (`src/crypto.js`):** API keys are now encrypted before saving using Zotero/Gecko's native **NSS Secret Decoder Ring (`key4.db`)** with an automatic **WebCrypto AES-256-GCM** fallback (using a separate 256-bit local profile key outside `prefs.js`).
- **Automatic Plaintext Migration & Wipe:** any API key saved in plaintext by `v1.0`–`v1.5.0` is transparently encrypted and wiped from `extensions.eixosOrganizer.aiApiKey` on startup.
- **Zero Key Leakage in HTTP / Logs:** Gemini requests now send the API key via the official `x-goog-api-key` header (instead of `?key=` in the URL), and all HTTP errors pass through `sanitizeErrorText()` so keys/tokens never appear in error messages or Zotero debug logs.
- **Settings Vault UX:** added an encryption status indicator (`🔒 Stored encrypted locally`) and a one-click **Clear Key** button in **Settings → Organizer**.
- **Repository Governance & Security:** hardened `.gitignore` against secret/key files, added `.github/pull_request_template.md`, created the `dev` development branch, and enforced the **`dev` → Pull Request → approval → `main`** release flow.

#### `v1.5.0` *(archived in GitHub Releases)*
- **Project renamed to Organizer:** unified branding across manifest, Settings tab, dialogs, notifications, menus, and `.xpi` filename (`organizer-v1.5.0.xpi`), while keeping the internal add-on ID (`eixos-organizer@danielbarreto.local`) and preference prefix intact for seamless in-place upgrades from `v1.x`.
- **Full English & Portuguese (PT-BR) support:** new `src/i18n.js` engine and **Language / Idioma** selector at the top of **Settings → Organizer** (`Auto`, `English`, `Português (Brasil)`). Switching language updates the Settings pane live without restarting Zotero and adapts all dialogs, notifications, default root naming (`<Folder> - By Axis & Theme` vs. `<Pasta> - Por Eixo e Tema`), offline topic seeds, and AI output language.
- **Bilingual documentation:** added complete English [`README.md`](README.md) and Brazilian Portuguese [`README.pt-BR.md`](README.pt-BR.md) with full release traceability.
- **Clean `dist/` folder:** `build.py` now outputs `dist/organizer-v<version>.xpi` and automatically removes outdated `.xpi` archives from `dist/` (all older releases remain preserved on GitHub Releases).

#### `v1.4.2` *(archived in GitHub Releases)*
- Switched `plan-dialog.xhtml` from `modal` to non-modal `openDialog`, fixing the Gecko 140 `saveTx()` deadlock so execution and live verification progress run smoothly while the window stays open.
- Removed `<select>` controls from inside the scrollable `<ul>` item list (eliminating Gecko chrome text overlap) and added clean single-line ellipsis truncation with full-title tooltips.
- Renumbered AI-generated new axes sequentially without gaps (`01`, `02`, `03`, …).

#### `v1.4.1` *(archived in GitHub Releases)*
- Added standardized automatic sequential numbering (`01 - Topic`, `02 - Topic`, … and `N.M Subtopic`) across offline mode, AI mode, and manually created plan indices, with prefix-insensitive deduplication.

#### `v1.4.0` *(archived in GitHub Releases)*
- Hybrid AI + keyword cross-checking (offline candidates sent to AI to validate agreements, reject false positives, and reconcile any omitted items).
- Automatic child-to-parent item resolution (`resolveParentItem`) with full bibliographic metadata (`DOI`, `ISBN`, `ISSN`, publisher, place, series, journal, thesis type, tags, abstract, attachment filenames).
- Faster Gemini execution via generation-aware `thinkingConfig` (`thinkingLevel: "low"` for Gemini 3/4, `thinkingBudget: 0` for Gemini 2.5), thought-part filtering, compact prompts, parallel chunks, and transient HTTP retries.
- Reliable real-time delivery with up to 3 automatic retries when Zotero is still fetching PDF metadata.
- Manual index creation and `+ Assign items` picker directly inside Plan Preview (available from the very first run).
- Live Zotero database verification (`collectionItems`) inside the plan dialog before closing.

#### `v1.3.0` *(archived in GitHub Releases)*
- Replaced one-by-one batch popups with a single-screen Plan Preview (`plan-dialog.xhtml`).
- Automatic detection/reuse of existing thematic subcollections or automatic creation of `<Parent> - Por Eixo e Tema` inside the source collection without needing a pre-created empty folder.
- Real-time automatic linking with clear placement notifications as default mode, and respect for items already placed manually inside thematic subcollections.

#### `v1.2.0` *(archived in GitHub Releases)*
- Closing `classify-dialog` with `X`, `Esc`, or **Cancel Batch** immediately aborts the remaining batch instead of skipping to the next item.
- Offline mode automatically creates initial thematic axes on empty destination folders instead of skipping everything with `0 linked`.

#### `v1.1.0` *(archived in GitHub Releases)*
- Fixed Zotero 10.0.8 installation (`applications.zotero.update_url` + `updates.json` + `amIAddonManagerStartup.registerChrome`).
- Fixed Zotero 10 `Cu.Sandbox` scope isolation in `preferences.js` so all Preferences buttons and dropdowns initialize properly.
- Updated authorship to **Daniel Barreto** (`eixos-organizer@danielbarreto.local`).

#### `v1.0.0` *(archived in GitHub Releases)*
- Initial prototype of `Eixos Organizer` (hybrid AI/offline classifier, interactive dialog, settings pane, menus, and non-destructive linking).

---

## Troubleshooting

- **Plugin does not appear after installation:** check **Tools → Plugins** to verify **Organizer** is enabled and that your Zotero version is between `7.0` and `10.*`.
- **New item was not auto-organized:** open **Edit → Settings → Organizer** and confirm the source collection is listed and checked as active. If the item was already inside one of the destination axes, right-click the item → **Organizer: Classify by Axis & Theme…** to reclassify manually.
- **AI connection error:** click **Test AI Connection** in Settings to see the exact error returned by your provider (API key, model ID, quota, or endpoint URL). In **Hybrid** mode, Organizer automatically falls back to Offline mode whenever the AI is unreachable.

---

## License

Released under the [MIT License](LICENSE) — © 2026 Daniel Barreto.

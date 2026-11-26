/* global Zotero, Services, ChromeUtils */

var EixosPluginState = {
  id: null,
  version: null,
  rootURI: null,
  loaded: false,
};

function install() {}

async function startup({ id, version, rootURI }, reason) {
  EixosPluginState.id = id;
  EixosPluginState.version = version;
  EixosPluginState.rootURI = rootURI;

  Services.scriptloader.loadSubScript(rootURI + "src/config.js", globalThis);
  Services.scriptloader.loadSubScript(rootURI + "src/organizer.js", globalThis);
  Services.scriptloader.loadSubScript(rootURI + "src/classifier.js", globalThis);
  Services.scriptloader.loadSubScript(rootURI + "src/main.js", globalThis);

  await EixosMain.startup({ id, version, rootURI });
  EixosPluginState.loaded = true;
}

function onMainWindowLoad({ window }) {
  if (typeof EixosMain !== "undefined" && EixosMain.onMainWindowLoad) {
    EixosMain.onMainWindowLoad(window);
  }
}

function onMainWindowUnload({ window }) {
  if (typeof EixosMain !== "undefined" && EixosMain.onMainWindowUnload) {
    EixosMain.onMainWindowUnload(window);
  }
}

function shutdown({ id, version, rootURI }, reason) {
  if (typeof APP_SHUTDOWN !== "undefined" && reason === APP_SHUTDOWN) return;
  if (typeof EixosMain !== "undefined" && EixosMain.shutdown) {
    EixosMain.shutdown();
  }
  EixosPluginState.loaded = false;
}

function uninstall() {}

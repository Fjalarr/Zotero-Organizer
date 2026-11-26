/* global Zotero, Services, ChromeUtils, Components */

var EixosPluginState = {
  id: null,
  version: null,
  rootURI: null,
  chromeHandle: null,
  loaded: false,
};

function install() {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  await Zotero.initializationPromise;

  if (!rootURI && resourceURI) {
    rootURI = resourceURI.spec;
  }

  EixosPluginState.id = id;
  EixosPluginState.version = version;
  EixosPluginState.rootURI = rootURI;

  try {
    const aomStartup = Components.classes[
      "@mozilla.org/addons/addon-manager-startup;1"
    ].getService(Components.interfaces.amIAddonManagerStartup);
    const manifestURI = Services.io.newURI(rootURI + "manifest.json");
    EixosPluginState.chromeHandle = aomStartup.registerChrome(manifestURI, [
      ["content", "eixos-organizer", rootURI + "chrome/content/"],
    ]);
  } catch (e) {
    Zotero.debug("Eixos Organizer: registerChrome error: " + e);
  }

  Services.scriptloader.loadSubScript(rootURI + "src/i18n.js", globalThis);
  Services.scriptloader.loadSubScript(rootURI + "src/crypto.js", globalThis);
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
  if (EixosPluginState.chromeHandle) {
    try {
      EixosPluginState.chromeHandle.destruct();
    } catch (e) {}
    EixosPluginState.chromeHandle = null;
  }
  EixosPluginState.loaded = false;
}

function uninstall() {}

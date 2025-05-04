"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var playwrightDispatcher_exports = {};
__export(playwrightDispatcher_exports, {
  PlaywrightDispatcher: () => PlaywrightDispatcher
});
module.exports = __toCommonJS(playwrightDispatcher_exports);
var import_socksProxy = require("../utils/socksProxy");
var import_fetch = require("../fetch");
var import_androidDispatcher = require("./androidDispatcher");
var import_androidDispatcher2 = require("./androidDispatcher");
var import_browserDispatcher = require("./browserDispatcher");
var import_browserTypeDispatcher = require("./browserTypeDispatcher");
var import_dispatcher = require("./dispatcher");
var import_electronDispatcher = require("./electronDispatcher");
var import_localUtilsDispatcher = require("./localUtilsDispatcher");
var import_networkDispatchers = require("./networkDispatchers");
var import_selectorsDispatcher = require("./selectorsDispatcher");
var import_crypto = require("../utils/crypto");
var import_eventsHelper = require("../utils/eventsHelper");
class PlaywrightDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, playwright, socksProxy, preLaunchedBrowser, prelaunchedAndroidDevice) {
    const browserDispatcher = preLaunchedBrowser ? new import_browserDispatcher.ConnectedBrowserDispatcher(scope, preLaunchedBrowser) : void 0;
    const android = new import_androidDispatcher.AndroidDispatcher(scope, playwright.android);
    const prelaunchedAndroidDeviceDispatcher = prelaunchedAndroidDevice ? new import_androidDispatcher2.AndroidDeviceDispatcher(android, prelaunchedAndroidDevice) : void 0;
    super(scope, playwright, "Playwright", {
      chromium: new import_browserTypeDispatcher.BrowserTypeDispatcher(scope, playwright.chromium),
      firefox: new import_browserTypeDispatcher.BrowserTypeDispatcher(scope, playwright.firefox),
      webkit: new import_browserTypeDispatcher.BrowserTypeDispatcher(scope, playwright.webkit),
      bidiChromium: new import_browserTypeDispatcher.BrowserTypeDispatcher(scope, playwright.bidiChromium),
      bidiFirefox: new import_browserTypeDispatcher.BrowserTypeDispatcher(scope, playwright.bidiFirefox),
      android,
      electron: new import_electronDispatcher.ElectronDispatcher(scope, playwright.electron),
      utils: playwright.options.isServer ? void 0 : new import_localUtilsDispatcher.LocalUtilsDispatcher(scope, playwright),
      selectors: new import_selectorsDispatcher.SelectorsDispatcher(scope, browserDispatcher?.selectors || playwright.selectors),
      preLaunchedBrowser: browserDispatcher,
      preConnectedAndroidDevice: prelaunchedAndroidDeviceDispatcher,
      socksSupport: socksProxy ? new SocksSupportDispatcher(scope, socksProxy) : void 0
    });
    this._type_Playwright = true;
    this._browserDispatcher = browserDispatcher;
  }
  async newRequest(params) {
    const request = new import_fetch.GlobalAPIRequestContext(this._object, params);
    return { request: import_networkDispatchers.APIRequestContextDispatcher.from(this.parentScope(), request) };
  }
  async cleanup() {
    await this._browserDispatcher?.cleanupContexts();
  }
}
class SocksSupportDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, socksProxy) {
    super(scope, { guid: "socksSupport@" + (0, import_crypto.createGuid)() }, "SocksSupport", {});
    this._type_SocksSupport = true;
    this._socksProxy = socksProxy;
    this._socksListeners = [
      import_eventsHelper.eventsHelper.addEventListener(socksProxy, import_socksProxy.SocksProxy.Events.SocksRequested, (payload) => this._dispatchEvent("socksRequested", payload)),
      import_eventsHelper.eventsHelper.addEventListener(socksProxy, import_socksProxy.SocksProxy.Events.SocksData, (payload) => this._dispatchEvent("socksData", payload)),
      import_eventsHelper.eventsHelper.addEventListener(socksProxy, import_socksProxy.SocksProxy.Events.SocksClosed, (payload) => this._dispatchEvent("socksClosed", payload))
    ];
  }
  async socksConnected(params) {
    this._socksProxy?.socketConnected(params);
  }
  async socksFailed(params) {
    this._socksProxy?.socketFailed(params);
  }
  async socksData(params) {
    this._socksProxy?.sendSocketData(params);
  }
  async socksError(params) {
    this._socksProxy?.sendSocketError(params);
  }
  async socksEnd(params) {
    this._socksProxy?.sendSocketEnd(params);
  }
  _onDispose() {
    import_eventsHelper.eventsHelper.removeEventListeners(this._socksListeners);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PlaywrightDispatcher
});

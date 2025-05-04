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
var browserTypeDispatcher_exports = {};
__export(browserTypeDispatcher_exports, {
  BrowserTypeDispatcher: () => BrowserTypeDispatcher
});
module.exports = __toCommonJS(browserTypeDispatcher_exports);
var import_browserContextDispatcher = require("./browserContextDispatcher");
var import_browserDispatcher = require("./browserDispatcher");
var import_dispatcher = require("./dispatcher");
class BrowserTypeDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, browserType) {
    super(scope, browserType, "BrowserType", {
      executablePath: browserType.executablePath(),
      name: browserType.name()
    });
    this._type_BrowserType = true;
  }
  async launch(params, metadata) {
    const browser = await this._object.launch(metadata, params);
    return { browser: new import_browserDispatcher.BrowserDispatcher(this, browser) };
  }
  async launchPersistentContext(params, metadata) {
    const browserContext = await this._object.launchPersistentContext(metadata, params.userDataDir, params);
    return { context: new import_browserContextDispatcher.BrowserContextDispatcher(this, browserContext) };
  }
  async connectOverCDP(params, metadata) {
    const browser = await this._object.connectOverCDP(metadata, params.endpointURL, params);
    const browserDispatcher = new import_browserDispatcher.BrowserDispatcher(this, browser);
    return {
      browser: browserDispatcher,
      defaultContext: browser._defaultContext ? new import_browserContextDispatcher.BrowserContextDispatcher(browserDispatcher, browser._defaultContext) : void 0
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserTypeDispatcher
});

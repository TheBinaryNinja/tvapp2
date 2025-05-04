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
var browserServerImpl_exports = {};
__export(browserServerImpl_exports, {
  BrowserServerLauncherImpl: () => BrowserServerLauncherImpl
});
module.exports = __toCommonJS(browserServerImpl_exports);
var import_socksProxy = require("./server/utils/socksProxy");
var import_playwrightServer = require("./remote/playwrightServer");
var import_helper = require("./server/helper");
var import_instrumentation = require("./server/instrumentation");
var import_playwright = require("./server/playwright");
var import_crypto = require("./server/utils/crypto");
var import_stackTrace = require("./utils/isomorphic/stackTrace");
var import_utilsBundle = require("./utilsBundle");
class BrowserServerLauncherImpl {
  constructor(browserName) {
    this._browserName = browserName;
  }
  async launchServer(options = {}) {
    const playwright = (0, import_playwright.createPlaywright)({ sdkLanguage: "javascript", isServer: true });
    const socksProxy = false ? new SocksProxy() : void 0;
    playwright.options.socksProxyPort = await socksProxy?.listen(0);
    const metadata = (0, import_instrumentation.serverSideCallMetadata)();
    const browser = await playwright[this._browserName].launch(metadata, {
      ...options,
      ignoreDefaultArgs: Array.isArray(options.ignoreDefaultArgs) ? options.ignoreDefaultArgs : void 0,
      ignoreAllDefaultArgs: !!options.ignoreDefaultArgs && !Array.isArray(options.ignoreDefaultArgs),
      env: options.env ? envObjectToArray(options.env) : void 0
    }, toProtocolLogger(options.logger)).catch((e) => {
      const log = import_helper.helper.formatBrowserLogs(metadata.log);
      (0, import_stackTrace.rewriteErrorMessage)(e, `${e.message} Failed to launch browser.${log}`);
      throw e;
    });
    const path = options.wsPath ? options.wsPath.startsWith("/") ? options.wsPath : `/${options.wsPath}` : `/${(0, import_crypto.createGuid)()}`;
    const server = new import_playwrightServer.PlaywrightServer({ mode: "launchServer", path, maxConnections: Infinity, preLaunchedBrowser: browser, preLaunchedSocksProxy: socksProxy });
    const wsEndpoint = await server.listen(options.port, options.host);
    const browserServer = new import_utilsBundle.ws.EventEmitter();
    browserServer.process = () => browser.options.browserProcess.process;
    browserServer.wsEndpoint = () => wsEndpoint;
    browserServer.close = () => browser.options.browserProcess.close();
    browserServer[Symbol.asyncDispose] = browserServer.close;
    browserServer.kill = () => browser.options.browserProcess.kill();
    browserServer._disconnectForTest = () => server.close();
    browserServer._userDataDirForTest = browser._userDataDirForTest;
    browser.options.browserProcess.onclose = (exitCode, signal) => {
      socksProxy?.close().catch(() => {
      });
      server.close();
      browserServer.emit("close", exitCode, signal);
    };
    return browserServer;
  }
}
function toProtocolLogger(logger) {
  return logger ? (direction, message) => {
    if (logger.isEnabled("protocol", "verbose"))
      logger.log("protocol", "verbose", (direction === "send" ? "SEND \u25BA " : "\u25C0 RECV ") + JSON.stringify(message), [], {});
  } : void 0;
}
function envObjectToArray(env) {
  const result = [];
  for (const name in env) {
    if (!Object.is(env[name], void 0))
      result.push({ name, value: String(env[name]) });
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserServerLauncherImpl
});

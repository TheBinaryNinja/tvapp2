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
var playwrightServer_exports = {};
__export(playwrightServer_exports, {
  PlaywrightServer: () => PlaywrightServer
});
module.exports = __toCommonJS(playwrightServer_exports);
var import_playwrightConnection = require("./playwrightConnection");
var import_playwright = require("../server/playwright");
var import_debugLogger = require("../server/utils/debugLogger");
var import_semaphore = require("../utils/isomorphic/semaphore");
var import_wsServer = require("../server/utils/wsServer");
var import_ascii = require("../server/utils/ascii");
var import_userAgent = require("../server/utils/userAgent");
class PlaywrightServer {
  constructor(options) {
    this._options = options;
    if (options.preLaunchedBrowser)
      this._preLaunchedPlaywright = options.preLaunchedBrowser.attribution.playwright;
    if (options.preLaunchedAndroidDevice)
      this._preLaunchedPlaywright = options.preLaunchedAndroidDevice._android.attribution.playwright;
    const browserSemaphore = new import_semaphore.Semaphore(this._options.maxConnections);
    const controllerSemaphore = new import_semaphore.Semaphore(1);
    const reuseBrowserSemaphore = new import_semaphore.Semaphore(1);
    this._wsServer = new import_wsServer.WSServer({
      onUpgrade: (request, socket) => {
        const uaError = userAgentVersionMatchesErrorMessage(request.headers["user-agent"] || "");
        if (uaError)
          return { error: `HTTP/${request.httpVersion} 428 Precondition Required\r
\r
${uaError}` };
      },
      onHeaders: (headers) => {
        if (process.env.PWTEST_SERVER_WS_HEADERS)
          headers.push(process.env.PWTEST_SERVER_WS_HEADERS);
      },
      onConnection: (request, url, ws, id) => {
        const browserHeader = request.headers["x-playwright-browser"];
        const browserName = url.searchParams.get("browser") || (Array.isArray(browserHeader) ? browserHeader[0] : browserHeader) || null;
        const proxyHeader = request.headers["x-playwright-proxy"];
        const proxyValue = url.searchParams.get("proxy") || (Array.isArray(proxyHeader) ? proxyHeader[0] : proxyHeader);
        const launchOptionsHeader = request.headers["x-playwright-launch-options"] || "";
        const launchOptionsHeaderValue = Array.isArray(launchOptionsHeader) ? launchOptionsHeader[0] : launchOptionsHeader;
        const launchOptionsParam = url.searchParams.get("launch-options");
        let launchOptions = {};
        try {
          launchOptions = JSON.parse(launchOptionsParam || launchOptionsHeaderValue);
        } catch (e) {
        }
        const isExtension = this._options.mode === "extension";
        if (isExtension) {
          if (!this._preLaunchedPlaywright)
            this._preLaunchedPlaywright = (0, import_playwright.createPlaywright)({ sdkLanguage: "javascript", isServer: true });
        }
        let clientType = "launch-browser";
        let semaphore = browserSemaphore;
        if (isExtension && url.searchParams.has("debug-controller")) {
          clientType = "controller";
          semaphore = controllerSemaphore;
        } else if (isExtension) {
          clientType = "reuse-browser";
          semaphore = reuseBrowserSemaphore;
        } else if (this._options.mode === "launchServer") {
          clientType = "pre-launched-browser-or-android";
          semaphore = browserSemaphore;
        }
        return new import_playwrightConnection.PlaywrightConnection(
          semaphore.acquire(),
          clientType,
          ws,
          { socksProxyPattern: proxyValue, browserName, launchOptions, allowFSPaths: this._options.mode === "extension" },
          {
            playwright: this._preLaunchedPlaywright,
            browser: this._options.preLaunchedBrowser,
            androidDevice: this._options.preLaunchedAndroidDevice,
            socksProxy: this._options.preLaunchedSocksProxy
          },
          id,
          () => semaphore.release()
        );
      },
      onClose: async () => {
        import_debugLogger.debugLogger.log("server", "closing browsers");
        if (this._preLaunchedPlaywright)
          await Promise.all(this._preLaunchedPlaywright.allBrowsers().map((browser) => browser.close({ reason: "Playwright Server stopped" })));
        import_debugLogger.debugLogger.log("server", "closed browsers");
      }
    });
  }
  async listen(port = 0, hostname) {
    return this._wsServer.listen(port, hostname, this._options.path);
  }
  async close() {
    await this._wsServer.close();
  }
}
function userAgentVersionMatchesErrorMessage(userAgent) {
  const match = userAgent.match(/^Playwright\/(\d+\.\d+\.\d+)/);
  if (!match) {
    return;
  }
  const received = match[1].split(".").slice(0, 2).join(".");
  const expected = (0, import_userAgent.getPlaywrightVersion)(true);
  if (received !== expected) {
    return (0, import_ascii.wrapInASCIIBox)([
      `Playwright version mismatch:`,
      `  - server version: v${expected}`,
      `  - client version: v${received}`,
      ``,
      `If you are using VSCode extension, restart VSCode.`,
      ``,
      `If you are connecting to a remote service,`,
      `keep your local Playwright version in sync`,
      `with the remote service version.`,
      ``,
      `<3 Playwright Team`
    ].join("\n"), 1);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PlaywrightServer
});

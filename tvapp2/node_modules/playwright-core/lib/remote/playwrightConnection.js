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
var playwrightConnection_exports = {};
__export(playwrightConnection_exports, {
  PlaywrightConnection: () => PlaywrightConnection
});
module.exports = __toCommonJS(playwrightConnection_exports);
var import_socksProxy = require("../server/utils/socksProxy");
var import_server = require("../server");
var import_android = require("../server/android/android");
var import_browser = require("../server/browser");
var import_debugControllerDispatcher = require("../server/dispatchers/debugControllerDispatcher");
var import_instrumentation = require("../server/instrumentation");
var import_assert = require("../utils/isomorphic/assert");
var import_debug = require("../server/utils/debug");
var import_profiler = require("../server/utils/profiler");
var import_utils = require("../utils");
var import_debugLogger = require("../server/utils/debugLogger");
class PlaywrightConnection {
  constructor(lock, clientType, ws, options, preLaunched, id, onClose) {
    this._cleanups = [];
    this._disconnected = false;
    this._ws = ws;
    this._preLaunched = preLaunched;
    this._options = options;
    options.launchOptions = filterLaunchOptions(options.launchOptions, options.allowFSPaths);
    if (clientType === "reuse-browser" || clientType === "pre-launched-browser-or-android")
      (0, import_assert.assert)(preLaunched.playwright);
    if (clientType === "pre-launched-browser-or-android")
      (0, import_assert.assert)(preLaunched.browser || preLaunched.androidDevice);
    this._onClose = onClose;
    this._id = id;
    this._profileName = `${(/* @__PURE__ */ new Date()).toISOString()}-${clientType}`;
    this._dispatcherConnection = new import_server.DispatcherConnection();
    this._dispatcherConnection.onmessage = async (message) => {
      await lock;
      if (ws.readyState !== ws.CLOSING) {
        const messageString = JSON.stringify(message);
        if (import_debugLogger.debugLogger.isEnabled("server:channel"))
          import_debugLogger.debugLogger.log("server:channel", `[${this._id}] ${(0, import_utils.monotonicTime)() * 1e3} SEND \u25BA ${messageString}`);
        if (import_debugLogger.debugLogger.isEnabled("server:metadata"))
          this.logServerMetadata(message, messageString, "SEND");
        ws.send(messageString);
      }
    };
    ws.on("message", async (message) => {
      await lock;
      const messageString = Buffer.from(message).toString();
      const jsonMessage = JSON.parse(messageString);
      if (import_debugLogger.debugLogger.isEnabled("server:channel"))
        import_debugLogger.debugLogger.log("server:channel", `[${this._id}] ${(0, import_utils.monotonicTime)() * 1e3} \u25C0 RECV ${messageString}`);
      if (import_debugLogger.debugLogger.isEnabled("server:metadata"))
        this.logServerMetadata(jsonMessage, messageString, "RECV");
      this._dispatcherConnection.dispatch(jsonMessage);
    });
    ws.on("close", () => this._onDisconnect());
    ws.on("error", (error) => this._onDisconnect(error));
    if (clientType === "controller") {
      this._root = this._initDebugControllerMode();
      return;
    }
    this._root = new import_server.RootDispatcher(this._dispatcherConnection, async (scope, options2) => {
      await (0, import_profiler.startProfiling)();
      if (clientType === "reuse-browser")
        return await this._initReuseBrowsersMode(scope);
      if (clientType === "pre-launched-browser-or-android")
        return this._preLaunched.browser ? await this._initPreLaunchedBrowserMode(scope) : await this._initPreLaunchedAndroidMode(scope);
      if (clientType === "launch-browser")
        return await this._initLaunchBrowserMode(scope, options2);
      throw new Error("Unsupported client type: " + clientType);
    });
  }
  async _initLaunchBrowserMode(scope, options) {
    import_debugLogger.debugLogger.log("server", `[${this._id}] engaged launch mode for "${this._options.browserName}"`);
    const playwright = (0, import_server.createPlaywright)({ sdkLanguage: options.sdkLanguage, isServer: true });
    const ownedSocksProxy = await this._createOwnedSocksProxy(playwright);
    let browserName = this._options.browserName;
    if ("bidi" === browserName) {
      if (this._options.launchOptions?.channel?.toLocaleLowerCase().includes("firefox"))
        browserName = "bidiFirefox";
      else
        browserName = "bidiChromium";
    }
    const browser = await playwright[browserName].launch((0, import_instrumentation.serverSideCallMetadata)(), this._options.launchOptions);
    this._cleanups.push(async () => {
      for (const browser2 of playwright.allBrowsers())
        await browser2.close({ reason: "Connection terminated" });
    });
    browser.on(import_browser.Browser.Events.Disconnected, () => {
      this.close({ code: 1001, reason: "Browser closed" });
    });
    return new import_server.PlaywrightDispatcher(scope, playwright, ownedSocksProxy, browser);
  }
  async _initPreLaunchedBrowserMode(scope) {
    import_debugLogger.debugLogger.log("server", `[${this._id}] engaged pre-launched (browser) mode`);
    const playwright = this._preLaunched.playwright;
    this._preLaunched.socksProxy?.setPattern(this._options.socksProxyPattern);
    const browser = this._preLaunched.browser;
    browser.on(import_browser.Browser.Events.Disconnected, () => {
      this.close({ code: 1001, reason: "Browser closed" });
    });
    const playwrightDispatcher = new import_server.PlaywrightDispatcher(scope, playwright, this._preLaunched.socksProxy, browser);
    for (const b of playwright.allBrowsers()) {
      if (b !== browser)
        await b.close({ reason: "Connection terminated" });
    }
    this._cleanups.push(() => playwrightDispatcher.cleanup());
    return playwrightDispatcher;
  }
  async _initPreLaunchedAndroidMode(scope) {
    import_debugLogger.debugLogger.log("server", `[${this._id}] engaged pre-launched (Android) mode`);
    const playwright = this._preLaunched.playwright;
    const androidDevice = this._preLaunched.androidDevice;
    androidDevice.on(import_android.AndroidDevice.Events.Close, () => {
      this.close({ code: 1001, reason: "Android device disconnected" });
    });
    const playwrightDispatcher = new import_server.PlaywrightDispatcher(scope, playwright, void 0, void 0, androidDevice);
    this._cleanups.push(() => playwrightDispatcher.cleanup());
    return playwrightDispatcher;
  }
  _initDebugControllerMode() {
    import_debugLogger.debugLogger.log("server", `[${this._id}] engaged reuse controller mode`);
    const playwright = this._preLaunched.playwright;
    return new import_debugControllerDispatcher.DebugControllerDispatcher(this._dispatcherConnection, playwright.debugController);
  }
  async _initReuseBrowsersMode(scope) {
    import_debugLogger.debugLogger.log("server", `[${this._id}] engaged reuse browsers mode for ${this._options.browserName}`);
    const playwright = this._preLaunched.playwright;
    const requestedOptions = launchOptionsHash(this._options.launchOptions);
    let browser = playwright.allBrowsers().find((b) => {
      if (b.options.name !== this._options.browserName)
        return false;
      const existingOptions = launchOptionsHash(b.options.originalLaunchOptions);
      return existingOptions === requestedOptions;
    });
    for (const b of playwright.allBrowsers()) {
      if (b === browser)
        continue;
      if (b.options.name === this._options.browserName && b.options.channel === this._options.launchOptions.channel)
        await b.close({ reason: "Connection terminated" });
    }
    if (!browser) {
      browser = await playwright[this._options.browserName || "chromium"].launch((0, import_instrumentation.serverSideCallMetadata)(), {
        ...this._options.launchOptions,
        headless: !!process.env.PW_DEBUG_CONTROLLER_HEADLESS
      });
      browser.on(import_browser.Browser.Events.Disconnected, () => {
        this.close({ code: 1001, reason: "Browser closed" });
      });
    }
    this._cleanups.push(async () => {
      for (const browser2 of playwright.allBrowsers()) {
        for (const context of browser2.contexts()) {
          if (!context.pages().length)
            await context.close({ reason: "Connection terminated" });
          else
            await context.stopPendingOperations("Connection closed");
        }
        if (!browser2.contexts())
          await browser2.close({ reason: "Connection terminated" });
      }
    });
    const playwrightDispatcher = new import_server.PlaywrightDispatcher(scope, playwright, void 0, browser);
    return playwrightDispatcher;
  }
  async _createOwnedSocksProxy(playwright) {
    if (!this._options.socksProxyPattern)
      return;
    const socksProxy = new import_socksProxy.SocksProxy();
    socksProxy.setPattern(this._options.socksProxyPattern);
    playwright.options.socksProxyPort = await socksProxy.listen(0);
    import_debugLogger.debugLogger.log("server", `[${this._id}] started socks proxy on port ${playwright.options.socksProxyPort}`);
    this._cleanups.push(() => socksProxy.close());
    return socksProxy;
  }
  async _onDisconnect(error) {
    this._disconnected = true;
    import_debugLogger.debugLogger.log("server", `[${this._id}] disconnected. error: ${error}`);
    this._root._dispose();
    import_debugLogger.debugLogger.log("server", `[${this._id}] starting cleanup`);
    for (const cleanup of this._cleanups)
      await cleanup().catch(() => {
      });
    await (0, import_profiler.stopProfiling)(this._profileName);
    this._onClose();
    import_debugLogger.debugLogger.log("server", `[${this._id}] finished cleanup`);
  }
  logServerMetadata(message, messageString, direction) {
    const serverLogMetadata = {
      wallTime: Date.now(),
      id: message.id,
      guid: message.guid,
      method: message.method,
      payloadSizeInBytes: Buffer.byteLength(messageString, "utf-8")
    };
    import_debugLogger.debugLogger.log("server:metadata", (direction === "SEND" ? "SEND \u25BA " : "\u25C0 RECV ") + JSON.stringify(serverLogMetadata));
  }
  async close(reason) {
    if (this._disconnected)
      return;
    import_debugLogger.debugLogger.log("server", `[${this._id}] force closing connection: ${reason?.reason || ""} (${reason?.code || 0})`);
    try {
      this._ws.close(reason?.code, reason?.reason);
    } catch (e) {
    }
  }
}
function launchOptionsHash(options) {
  const copy = { ...options };
  for (const k of Object.keys(copy)) {
    const key = k;
    if (copy[key] === defaultLaunchOptions[key])
      delete copy[key];
  }
  for (const key of optionsThatAllowBrowserReuse)
    delete copy[key];
  return JSON.stringify(copy);
}
function filterLaunchOptions(options, allowFSPaths) {
  return {
    channel: options.channel,
    args: options.args,
    ignoreAllDefaultArgs: options.ignoreAllDefaultArgs,
    ignoreDefaultArgs: options.ignoreDefaultArgs,
    timeout: options.timeout,
    headless: options.headless,
    proxy: options.proxy,
    chromiumSandbox: options.chromiumSandbox,
    firefoxUserPrefs: options.firefoxUserPrefs,
    slowMo: options.slowMo,
    executablePath: (0, import_debug.isUnderTest)() || allowFSPaths ? options.executablePath : void 0,
    downloadsPath: allowFSPaths ? options.downloadsPath : void 0
  };
}
const defaultLaunchOptions = {
  ignoreAllDefaultArgs: false,
  handleSIGINT: false,
  handleSIGTERM: false,
  handleSIGHUP: false,
  headless: true,
  devtools: false
};
const optionsThatAllowBrowserReuse = [
  "headless",
  "tracesDir"
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PlaywrightConnection
});

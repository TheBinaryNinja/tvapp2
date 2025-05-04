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
var browserType_exports = {};
__export(browserType_exports, {
  BrowserType: () => BrowserType
});
module.exports = __toCommonJS(browserType_exports);
var import_browser = require("./browser");
var import_browserContext = require("./browserContext");
var import_channelOwner = require("./channelOwner");
var import_clientHelper = require("./clientHelper");
var import_events = require("./events");
var import_assert = require("../utils/isomorphic/assert");
var import_headers = require("../utils/isomorphic/headers");
var import_time = require("../utils/isomorphic/time");
var import_timeoutRunner = require("../utils/isomorphic/timeoutRunner");
var import_webSocket = require("./webSocket");
class BrowserType extends import_channelOwner.ChannelOwner {
  constructor() {
    super(...arguments);
    this._contexts = /* @__PURE__ */ new Set();
  }
  static from(browserType) {
    return browserType._object;
  }
  executablePath() {
    if (!this._initializer.executablePath)
      throw new Error("Browser is not supported on current platform");
    return this._initializer.executablePath;
  }
  name() {
    return this._initializer.name;
  }
  async launch(options = {}) {
    (0, import_assert.assert)(!options.userDataDir, "userDataDir option is not supported in `browserType.launch`. Use `browserType.launchPersistentContext` instead");
    (0, import_assert.assert)(!options.port, "Cannot specify a port without launching as a server.");
    const logger = options.logger || this._playwright._defaultLaunchOptions?.logger;
    options = { ...this._playwright._defaultLaunchOptions, ...options };
    const launchOptions = {
      ...options,
      ignoreDefaultArgs: Array.isArray(options.ignoreDefaultArgs) ? options.ignoreDefaultArgs : void 0,
      ignoreAllDefaultArgs: !!options.ignoreDefaultArgs && !Array.isArray(options.ignoreDefaultArgs),
      env: options.env ? (0, import_clientHelper.envObjectToArray)(options.env) : void 0
    };
    return await this._wrapApiCall(async () => {
      const browser = import_browser.Browser.from((await this._channel.launch(launchOptions)).browser);
      this._didLaunchBrowser(browser, options, logger);
      return browser;
    });
  }
  async launchServer(options = {}) {
    if (!this._serverLauncher)
      throw new Error("Launching server is not supported");
    options = { ...this._playwright._defaultLaunchOptions, ...options };
    return await this._serverLauncher.launchServer(options);
  }
  async launchPersistentContext(userDataDir, options = {}) {
    const logger = options.logger || this._playwright._defaultLaunchOptions?.logger;
    (0, import_assert.assert)(!options.port, "Cannot specify a port without launching as a server.");
    options = { ...this._playwright._defaultLaunchOptions, ...this._playwright._defaultContextOptions, ...options };
    const contextParams = await (0, import_browserContext.prepareBrowserContextParams)(this._platform, options);
    const persistentParams = {
      ...contextParams,
      ignoreDefaultArgs: Array.isArray(options.ignoreDefaultArgs) ? options.ignoreDefaultArgs : void 0,
      ignoreAllDefaultArgs: !!options.ignoreDefaultArgs && !Array.isArray(options.ignoreDefaultArgs),
      env: options.env ? (0, import_clientHelper.envObjectToArray)(options.env) : void 0,
      channel: options.channel,
      userDataDir: this._platform.path().isAbsolute(userDataDir) || !userDataDir ? userDataDir : this._platform.path().resolve(userDataDir)
    };
    return await this._wrapApiCall(async () => {
      const result = await this._channel.launchPersistentContext(persistentParams);
      const context = import_browserContext.BrowserContext.from(result.context);
      await this._didCreateContext(context, contextParams, options, logger);
      return context;
    });
  }
  async connect(optionsOrWsEndpoint, options) {
    if (typeof optionsOrWsEndpoint === "string")
      return await this._connect({ ...options, wsEndpoint: optionsOrWsEndpoint });
    (0, import_assert.assert)(optionsOrWsEndpoint.wsEndpoint, "options.wsEndpoint is required");
    return await this._connect(optionsOrWsEndpoint);
  }
  async _connect(params) {
    const logger = params.logger;
    return await this._wrapApiCall(async () => {
      const deadline = params.timeout ? (0, import_time.monotonicTime)() + params.timeout : 0;
      const headers = { "x-playwright-browser": this.name(), ...params.headers };
      const connectParams = {
        wsEndpoint: params.wsEndpoint,
        headers,
        exposeNetwork: params.exposeNetwork ?? params._exposeNetwork,
        slowMo: params.slowMo,
        timeout: params.timeout
      };
      if (params.__testHookRedirectPortForwarding)
        connectParams.socksProxyRedirectPortForTest = params.__testHookRedirectPortForwarding;
      const connection = await (0, import_webSocket.connectOverWebSocket)(this._connection, connectParams);
      let browser;
      connection.on("close", () => {
        for (const context of browser?.contexts() || []) {
          for (const page of context.pages())
            page._onClose();
          context._onClose();
        }
        setTimeout(() => browser?._didClose(), 0);
      });
      const result = await (0, import_timeoutRunner.raceAgainstDeadline)(async () => {
        if (params.__testHookBeforeCreateBrowser)
          await params.__testHookBeforeCreateBrowser();
        const playwright = await connection.initializePlaywright();
        if (!playwright._initializer.preLaunchedBrowser) {
          connection.close();
          throw new Error("Malformed endpoint. Did you use BrowserType.launchServer method?");
        }
        playwright._setSelectors(this._playwright.selectors);
        browser = import_browser.Browser.from(playwright._initializer.preLaunchedBrowser);
        this._didLaunchBrowser(browser, {}, logger);
        browser._shouldCloseConnectionOnClose = true;
        browser.on(import_events.Events.Browser.Disconnected, () => connection.close());
        return browser;
      }, deadline);
      if (!result.timedOut) {
        return result.result;
      } else {
        connection.close();
        throw new Error(`Timeout ${params.timeout}ms exceeded`);
      }
    });
  }
  async connectOverCDP(endpointURLOrOptions, options) {
    if (typeof endpointURLOrOptions === "string")
      return await this._connectOverCDP(endpointURLOrOptions, options);
    const endpointURL = "endpointURL" in endpointURLOrOptions ? endpointURLOrOptions.endpointURL : endpointURLOrOptions.wsEndpoint;
    (0, import_assert.assert)(endpointURL, "Cannot connect over CDP without wsEndpoint.");
    return await this.connectOverCDP(endpointURL, endpointURLOrOptions);
  }
  async _connectOverCDP(endpointURL, params = {}) {
    if (this.name() !== "chromium")
      throw new Error("Connecting over CDP is only supported in Chromium.");
    const headers = params.headers ? (0, import_headers.headersObjectToArray)(params.headers) : void 0;
    const result = await this._channel.connectOverCDP({
      endpointURL,
      headers,
      slowMo: params.slowMo,
      timeout: params.timeout
    });
    const browser = import_browser.Browser.from(result.browser);
    this._didLaunchBrowser(browser, {}, params.logger);
    if (result.defaultContext)
      await this._didCreateContext(import_browserContext.BrowserContext.from(result.defaultContext), {}, {}, params.logger);
    return browser;
  }
  _didLaunchBrowser(browser, browserOptions, logger) {
    browser._browserType = this;
    browser._options = browserOptions;
    browser._logger = logger;
  }
  async _didCreateContext(context, contextOptions, browserOptions, logger) {
    context._logger = logger;
    context._browserType = this;
    this._contexts.add(context);
    context._setOptions(contextOptions, browserOptions);
    if (this._playwright._defaultContextTimeout !== void 0)
      context.setDefaultTimeout(this._playwright._defaultContextTimeout);
    if (this._playwright._defaultContextNavigationTimeout !== void 0)
      context.setDefaultNavigationTimeout(this._playwright._defaultContextNavigationTimeout);
    await this._instrumentation.runAfterCreateBrowserContext(context);
  }
  async _willCloseContext(context) {
    this._contexts.delete(context);
    await this._instrumentation.runBeforeCloseBrowserContext(context);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserType
});

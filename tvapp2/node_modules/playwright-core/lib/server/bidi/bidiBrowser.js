"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var bidiBrowser_exports = {};
__export(bidiBrowser_exports, {
  BidiBrowser: () => BidiBrowser,
  BidiBrowserContext: () => BidiBrowserContext,
  Network: () => Network
});
module.exports = __toCommonJS(bidiBrowser_exports);
var import_eventsHelper = require("../utils/eventsHelper");
var import_browser = require("../browser");
var import_browserContext = require("../browserContext");
var network = __toESM(require("../network"));
var import_bidiConnection = require("./bidiConnection");
var import_bidiNetworkManager = require("./bidiNetworkManager");
var import_bidiPage = require("./bidiPage");
var bidi = __toESM(require("./third_party/bidiProtocol"));
class BidiBrowser extends import_browser.Browser {
  constructor(parent, transport, options) {
    super(parent, options);
    this._contexts = /* @__PURE__ */ new Map();
    this._bidiPages = /* @__PURE__ */ new Map();
    this._connection = new import_bidiConnection.BidiConnection(transport, this._onDisconnect.bind(this), options.protocolLogger, options.browserLogsCollector);
    this._browserSession = this._connection.browserSession;
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(this._browserSession, "browsingContext.contextCreated", this._onBrowsingContextCreated.bind(this)),
      import_eventsHelper.eventsHelper.addEventListener(this._browserSession, "script.realmDestroyed", this._onScriptRealmDestroyed.bind(this))
    ];
  }
  static async connect(parent, transport, options) {
    const browser = new BidiBrowser(parent, transport, options);
    if (options.__testHookOnConnectToBrowser)
      await options.__testHookOnConnectToBrowser();
    let proxy;
    if (options.proxy) {
      proxy = {
        proxyType: "manual"
      };
      const url = new URL(options.proxy.server);
      switch (url.protocol) {
        case "http:":
          proxy.httpProxy = url.host;
          break;
        case "https:":
          proxy.httpsProxy = url.host;
          break;
        case "socks4:":
          proxy.socksProxy = url.host;
          proxy.socksVersion = 4;
          break;
        case "socks5:":
          proxy.socksProxy = url.host;
          proxy.socksVersion = 5;
          break;
        default:
          throw new Error("Invalid proxy server protocol: " + options.proxy.server);
      }
      if (options.proxy.bypass)
        proxy.noProxy = options.proxy.bypass.split(",");
    }
    browser._bidiSessionInfo = await browser._browserSession.send("session.new", {
      capabilities: {
        alwaysMatch: {
          acceptInsecureCerts: false,
          proxy,
          unhandledPromptBehavior: {
            default: bidi.Session.UserPromptHandlerType.Ignore
          },
          webSocketUrl: true
        }
      }
    });
    await browser._browserSession.send("session.subscribe", {
      events: [
        "browsingContext",
        "network",
        "log",
        "script"
      ]
    });
    if (options.persistent) {
      const context = new BidiBrowserContext(browser, void 0, options.persistent);
      browser._defaultContext = context;
      await context._initialize();
      const page = await browser._defaultContext.doCreateNewPage();
      await page.waitForInitializedOrError();
    }
    return browser;
  }
  _onDisconnect() {
    this._didClose();
  }
  async doCreateNewContext(options) {
    const { userContext } = await this._browserSession.send("browser.createUserContext", {});
    const context = new BidiBrowserContext(this, userContext, options);
    await context._initialize();
    this._contexts.set(userContext, context);
    return context;
  }
  contexts() {
    return Array.from(this._contexts.values());
  }
  version() {
    return this._bidiSessionInfo.capabilities.browserVersion;
  }
  userAgent() {
    return this._bidiSessionInfo.capabilities.userAgent;
  }
  isConnected() {
    return !this._connection.isClosed();
  }
  _onBrowsingContextCreated(event) {
    if (event.parent) {
      const parentFrameId = event.parent;
      for (const page2 of this._bidiPages.values()) {
        const parentFrame = page2._page._frameManager.frame(parentFrameId);
        if (!parentFrame)
          continue;
        page2._session.addFrameBrowsingContext(event.context);
        page2._page._frameManager.frameAttached(event.context, parentFrameId);
        const frame = page2._page._frameManager.frame(event.context);
        if (frame)
          frame._url = event.url;
        return;
      }
      return;
    }
    let context = this._contexts.get(event.userContext);
    if (!context)
      context = this._defaultContext;
    if (!context)
      return;
    const session = this._connection.createMainFrameBrowsingContextSession(event.context);
    const opener = event.originalOpener && this._bidiPages.get(event.originalOpener);
    const page = new import_bidiPage.BidiPage(context, session, opener || null);
    page._page.mainFrame()._url = event.url;
    this._bidiPages.set(event.context, page);
  }
  _onBrowsingContextDestroyed(event) {
    if (event.parent) {
      this._browserSession.removeFrameBrowsingContext(event.context);
      const parentFrameId = event.parent;
      for (const page of this._bidiPages.values()) {
        const parentFrame = page._page._frameManager.frame(parentFrameId);
        if (!parentFrame)
          continue;
        page._page._frameManager.frameDetached(event.context);
        return;
      }
      return;
    }
    const bidiPage = this._bidiPages.get(event.context);
    if (!bidiPage)
      return;
    bidiPage.didClose();
    this._bidiPages.delete(event.context);
  }
  _onScriptRealmDestroyed(event) {
    for (const page of this._bidiPages.values()) {
      if (page._onRealmDestroyed(event))
        return;
    }
  }
}
class BidiBrowserContext extends import_browserContext.BrowserContext {
  constructor(browser, browserContextId, options) {
    super(browser, options, browserContextId);
    this._initScriptIds = [];
    this._authenticateProxyViaHeader();
  }
  _bidiPages() {
    return [...this._browser._bidiPages.values()].filter((bidiPage) => bidiPage._browserContext === this);
  }
  async _initialize() {
    const promises = [
      super._initialize(),
      this._installMainBinding()
    ];
    if (this._options.viewport) {
      promises.push(this._browser._browserSession.send("browsingContext.setViewport", {
        viewport: {
          width: this._options.viewport.width,
          height: this._options.viewport.height
        },
        devicePixelRatio: this._options.deviceScaleFactor || 1,
        userContexts: [this._userContextId()]
      }));
    }
    await Promise.all(promises);
  }
  // TODO: consider calling this only when bindings are added.
  async _installMainBinding() {
    const functionDeclaration = import_bidiPage.addMainBinding.toString();
    const args = [{
      type: "channel",
      value: {
        channel: import_bidiPage.kPlaywrightBindingChannel,
        ownership: bidi.Script.ResultOwnership.Root
      }
    }];
    await this._browser._browserSession.send("script.addPreloadScript", {
      functionDeclaration,
      arguments: args,
      userContexts: [this._userContextId()]
    });
  }
  possiblyUninitializedPages() {
    return this._bidiPages().map((bidiPage) => bidiPage._page);
  }
  async doCreateNewPage() {
    (0, import_browserContext.assertBrowserContextIsNotOwned)(this);
    const { context } = await this._browser._browserSession.send("browsingContext.create", {
      type: bidi.BrowsingContext.CreateType.Window,
      userContext: this._browserContextId
    });
    return this._browser._bidiPages.get(context)._page;
  }
  async doGetCookies(urls) {
    const { cookies } = await this._browser._browserSession.send(
      "storage.getCookies",
      { partition: { type: "storageKey", userContext: this._browserContextId } }
    );
    return network.filterCookies(cookies.map((c) => {
      const copy = {
        name: c.name,
        value: (0, import_bidiNetworkManager.bidiBytesValueToString)(c.value),
        domain: c.domain,
        path: c.path,
        httpOnly: c.httpOnly,
        secure: c.secure,
        expires: c.expiry ?? -1,
        sameSite: c.sameSite ? fromBidiSameSite(c.sameSite) : "None"
      };
      return copy;
    }), urls);
  }
  async addCookies(cookies) {
    cookies = network.rewriteCookies(cookies);
    const promises = cookies.map((c) => {
      const cookie = {
        name: c.name,
        value: { type: "string", value: c.value },
        domain: c.domain,
        path: c.path,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite && toBidiSameSite(c.sameSite),
        expiry: c.expires === -1 || c.expires === void 0 ? void 0 : Math.round(c.expires)
      };
      return this._browser._browserSession.send(
        "storage.setCookie",
        { cookie, partition: { type: "storageKey", userContext: this._browserContextId } }
      );
    });
    await Promise.all(promises);
  }
  async doClearCookies() {
    await this._browser._browserSession.send(
      "storage.deleteCookies",
      { partition: { type: "storageKey", userContext: this._browserContextId } }
    );
  }
  async doGrantPermissions(origin, permissions) {
  }
  async doClearPermissions() {
  }
  async setGeolocation(geolocation) {
  }
  async setExtraHTTPHeaders(headers) {
  }
  async setUserAgent(userAgent) {
  }
  async setOffline(offline) {
  }
  async doSetHTTPCredentials(httpCredentials) {
    this._options.httpCredentials = httpCredentials;
    for (const page of this.pages())
      await page._delegate.updateHttpCredentials();
  }
  async doAddInitScript(initScript) {
    const { script } = await this._browser._browserSession.send("script.addPreloadScript", {
      // TODO: remove function call from the source.
      functionDeclaration: `() => { return ${initScript.source} }`,
      userContexts: [this._browserContextId || "default"]
    });
    if (!initScript.internal)
      this._initScriptIds.push(script);
  }
  async doRemoveNonInternalInitScripts() {
    const promise = Promise.all(this._initScriptIds.map((script) => this._browser._browserSession.send("script.removePreloadScript", { script })));
    this._initScriptIds = [];
    await promise;
  }
  async doUpdateRequestInterception() {
  }
  onClosePersistent() {
  }
  async clearCache() {
  }
  async doClose(reason) {
    if (!this._browserContextId) {
      await this._browser.close({ reason });
      return;
    }
    await this._browser._browserSession.send("browser.removeUserContext", {
      userContext: this._browserContextId
    });
    this._browser._contexts.delete(this._browserContextId);
  }
  async cancelDownload(uuid) {
  }
  _userContextId() {
    if (this._browserContextId)
      return this._browserContextId;
    return "default";
  }
}
function fromBidiSameSite(sameSite) {
  switch (sameSite) {
    case "strict":
      return "Strict";
    case "lax":
      return "Lax";
    case "none":
      return "None";
  }
  return "None";
}
function toBidiSameSite(sameSite) {
  switch (sameSite) {
    case "Strict":
      return bidi.Network.SameSite.Strict;
    case "Lax":
      return bidi.Network.SameSite.Lax;
    case "None":
      return bidi.Network.SameSite.None;
  }
  return bidi.Network.SameSite.None;
}
var Network;
((Network2) => {
  let SameSite;
  ((SameSite2) => {
    SameSite2["Strict"] = "strict";
    SameSite2["Lax"] = "lax";
    SameSite2["None"] = "none";
  })(SameSite = Network2.SameSite || (Network2.SameSite = {}));
})(Network || (Network = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BidiBrowser,
  BidiBrowserContext,
  Network
});

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
var browserDispatcher_exports = {};
__export(browserDispatcher_exports, {
  BrowserDispatcher: () => BrowserDispatcher,
  ConnectedBrowserDispatcher: () => ConnectedBrowserDispatcher
});
module.exports = __toCommonJS(browserDispatcher_exports);
var import_browser = require("../browser");
var import_browserContextDispatcher = require("./browserContextDispatcher");
var import_cdpSessionDispatcher = require("./cdpSessionDispatcher");
var import_dispatcher = require("./dispatcher");
var import_dispatcher2 = require("./dispatcher");
var import_browserContext = require("../browserContext");
var import_selectors = require("../selectors");
var import_artifactDispatcher = require("./artifactDispatcher");
class BrowserDispatcher extends import_dispatcher2.Dispatcher {
  constructor(scope, browser) {
    super(scope, browser, "Browser", { version: browser.version(), name: browser.options.name });
    this._type_Browser = true;
    this.addObjectListener(import_browser.Browser.Events.Disconnected, () => this._didClose());
  }
  _didClose() {
    this._dispatchEvent("close");
    this._dispose();
  }
  async newContext(params, metadata) {
    const context = await this._object.newContext(metadata, params);
    return { context: new import_browserContextDispatcher.BrowserContextDispatcher(this, context) };
  }
  async newContextForReuse(params, metadata) {
    return await newContextForReuse(this._object, this, params, null, metadata);
  }
  async stopPendingOperations(params, metadata) {
    await this._object.stopPendingOperations(params.reason);
  }
  async close(params, metadata) {
    metadata.potentiallyClosesScope = true;
    await this._object.close(params);
  }
  async killForTests(_, metadata) {
    metadata.potentiallyClosesScope = true;
    await this._object.killForTests();
  }
  async defaultUserAgentForTest() {
    return { userAgent: this._object.userAgent() };
  }
  async newBrowserCDPSession() {
    if (!this._object.options.isChromium)
      throw new Error(`CDP session is only available in Chromium`);
    const crBrowser = this._object;
    return { session: new import_cdpSessionDispatcher.CDPSessionDispatcher(this, await crBrowser.newBrowserCDPSession()) };
  }
  async startTracing(params) {
    if (!this._object.options.isChromium)
      throw new Error(`Tracing is only available in Chromium`);
    const crBrowser = this._object;
    await crBrowser.startTracing(params.page ? params.page._object : void 0, params);
  }
  async stopTracing() {
    if (!this._object.options.isChromium)
      throw new Error(`Tracing is only available in Chromium`);
    const crBrowser = this._object;
    return { artifact: import_artifactDispatcher.ArtifactDispatcher.from(this, await crBrowser.stopTracing()) };
  }
}
class ConnectedBrowserDispatcher extends import_dispatcher2.Dispatcher {
  constructor(scope, browser) {
    super(scope, browser, "Browser", { version: browser.version(), name: browser.options.name });
    this._type_Browser = true;
    this._contexts = /* @__PURE__ */ new Set();
    this.selectors = new import_selectors.Selectors();
  }
  async newContext(params, metadata) {
    if (params.recordVideo)
      params.recordVideo.dir = this._object.options.artifactsDir;
    const context = await this._object.newContext(metadata, params);
    this._contexts.add(context);
    context.setSelectors(this.selectors);
    context.on(import_browserContext.BrowserContext.Events.Close, () => this._contexts.delete(context));
    return { context: new import_browserContextDispatcher.BrowserContextDispatcher(this, context) };
  }
  async newContextForReuse(params, metadata) {
    return await newContextForReuse(this._object, this, params, this.selectors, metadata);
  }
  async stopPendingOperations(params, metadata) {
    await this._object.stopPendingOperations(params.reason);
  }
  async close() {
  }
  async killForTests() {
  }
  async defaultUserAgentForTest() {
    throw new Error("Client should not send us Browser.defaultUserAgentForTest");
  }
  async newBrowserCDPSession() {
    if (!this._object.options.isChromium)
      throw new Error(`CDP session is only available in Chromium`);
    const crBrowser = this._object;
    return { session: new import_cdpSessionDispatcher.CDPSessionDispatcher(this, await crBrowser.newBrowserCDPSession()) };
  }
  async startTracing(params) {
    if (!this._object.options.isChromium)
      throw new Error(`Tracing is only available in Chromium`);
    const crBrowser = this._object;
    await crBrowser.startTracing(params.page ? params.page._object : void 0, params);
  }
  async stopTracing() {
    if (!this._object.options.isChromium)
      throw new Error(`Tracing is only available in Chromium`);
    const crBrowser = this._object;
    return { artifact: import_artifactDispatcher.ArtifactDispatcher.from(this, await crBrowser.stopTracing()) };
  }
  async cleanupContexts() {
    await Promise.all(Array.from(this._contexts).map((context) => context.close({ reason: "Global context cleanup (connection terminated)" })));
  }
}
async function newContextForReuse(browser, scope, params, selectors, metadata) {
  const { context, needsReset } = await browser.newContextForReuse(params, metadata);
  if (needsReset) {
    const oldContextDispatcher = (0, import_dispatcher.existingDispatcher)(context);
    if (oldContextDispatcher)
      oldContextDispatcher._dispose();
    await context.resetForReuse(metadata, params);
  }
  if (selectors)
    context.setSelectors(selectors);
  const contextDispatcher = new import_browserContextDispatcher.BrowserContextDispatcher(scope, context);
  return { context: contextDispatcher };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserDispatcher,
  ConnectedBrowserDispatcher
});

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
var browser_exports = {};
__export(browser_exports, {
  Browser: () => Browser
});
module.exports = __toCommonJS(browser_exports);
var import_artifact = require("./artifact");
var import_browserContext = require("./browserContext");
var import_cdpSession = require("./cdpSession");
var import_channelOwner = require("./channelOwner");
var import_errors = require("./errors");
var import_events = require("./events");
var import_fileUtils = require("./fileUtils");
class Browser extends import_channelOwner.ChannelOwner {
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._contexts = /* @__PURE__ */ new Set();
    this._isConnected = true;
    this._shouldCloseConnectionOnClose = false;
    this._options = {};
    this._name = initializer.name;
    this._channel.on("close", () => this._didClose());
    this._closedPromise = new Promise((f) => this.once(import_events.Events.Browser.Disconnected, f));
  }
  static from(browser) {
    return browser._object;
  }
  browserType() {
    return this._browserType;
  }
  async newContext(options = {}) {
    return await this._innerNewContext(options, false);
  }
  async _newContextForReuse(options = {}) {
    return await this._wrapApiCall(async () => {
      for (const context of this._contexts) {
        await this._browserType._willCloseContext(context);
        for (const page of context.pages())
          page._onClose();
        context._onClose();
      }
      return await this._innerNewContext(options, true);
    }, true);
  }
  async _stopPendingOperations(reason) {
    return await this._wrapApiCall(async () => {
      await this._channel.stopPendingOperations({ reason });
    }, true);
  }
  async _innerNewContext(options = {}, forReuse) {
    options = { ...this._browserType._playwright._defaultContextOptions, ...options };
    const contextOptions = await (0, import_browserContext.prepareBrowserContextParams)(this._platform, options);
    const response = forReuse ? await this._channel.newContextForReuse(contextOptions) : await this._channel.newContext(contextOptions);
    const context = import_browserContext.BrowserContext.from(response.context);
    await this._browserType._didCreateContext(context, contextOptions, this._options, options.logger || this._logger);
    return context;
  }
  contexts() {
    return [...this._contexts];
  }
  version() {
    return this._initializer.version;
  }
  async newPage(options = {}) {
    return await this._wrapApiCall(async () => {
      const context = await this.newContext(options);
      const page = await context.newPage();
      page._ownedContext = context;
      context._ownerPage = page;
      return page;
    });
  }
  isConnected() {
    return this._isConnected;
  }
  async newBrowserCDPSession() {
    return import_cdpSession.CDPSession.from((await this._channel.newBrowserCDPSession()).session);
  }
  async startTracing(page, options = {}) {
    this._path = options.path;
    await this._channel.startTracing({ ...options, page: page ? page._channel : void 0 });
  }
  async stopTracing() {
    const artifact = import_artifact.Artifact.from((await this._channel.stopTracing()).artifact);
    const buffer = await artifact.readIntoBuffer();
    await artifact.delete();
    if (this._path) {
      await (0, import_fileUtils.mkdirIfNeeded)(this._platform, this._path);
      await this._platform.fs().promises.writeFile(this._path, buffer);
      this._path = void 0;
    }
    return buffer;
  }
  async [Symbol.asyncDispose]() {
    await this.close();
  }
  async close(options = {}) {
    this._closeReason = options.reason;
    try {
      if (this._shouldCloseConnectionOnClose)
        this._connection.close();
      else
        await this._channel.close(options);
      await this._closedPromise;
    } catch (e) {
      if ((0, import_errors.isTargetClosedError)(e))
        return;
      throw e;
    }
  }
  _didClose() {
    this._isConnected = false;
    this.emit(import_events.Events.Browser.Disconnected, this);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Browser
});

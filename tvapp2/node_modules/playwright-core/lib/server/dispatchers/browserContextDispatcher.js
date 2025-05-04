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
var browserContextDispatcher_exports = {};
__export(browserContextDispatcher_exports, {
  BrowserContextDispatcher: () => BrowserContextDispatcher
});
module.exports = __toCommonJS(browserContextDispatcher_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_browserContext = require("../browserContext");
var import_artifactDispatcher = require("./artifactDispatcher");
var import_cdpSessionDispatcher = require("./cdpSessionDispatcher");
var import_dialogDispatcher = require("./dialogDispatcher");
var import_dispatcher = require("./dispatcher");
var import_elementHandlerDispatcher = require("./elementHandlerDispatcher");
var import_networkDispatchers = require("./networkDispatchers");
var import_pageDispatcher = require("./pageDispatcher");
var import_crBrowser = require("../chromium/crBrowser");
var import_errors = require("../errors");
var import_recorder = require("../recorder");
var import_tracingDispatcher = require("./tracingDispatcher");
var import_webSocketRouteDispatcher = require("./webSocketRouteDispatcher");
var import_writableStreamDispatcher = require("./writableStreamDispatcher");
var import_crypto = require("../utils/crypto");
var import_urlMatch = require("../../utils/isomorphic/urlMatch");
var import_recorderApp = require("../recorder/recorderApp");
class BrowserContextDispatcher extends import_dispatcher.Dispatcher {
  constructor(parentScope, context) {
    const requestContext = import_networkDispatchers.APIRequestContextDispatcher.from(parentScope, context.fetchRequest);
    const tracing = import_tracingDispatcher.TracingDispatcher.from(parentScope, context.tracing);
    super(parentScope, context, "BrowserContext", {
      isChromium: context._browser.options.isChromium,
      isLocalBrowserOnServer: context._browser._isCollocatedWithServer,
      requestContext,
      tracing
    });
    this._type_EventTarget = true;
    this._type_BrowserContext = true;
    this._subscriptions = /* @__PURE__ */ new Set();
    this._webSocketInterceptionPatterns = [];
    this.adopt(requestContext);
    this.adopt(tracing);
    this._context = context;
    const onVideo = (artifact) => {
      const artifactDispatcher = import_artifactDispatcher.ArtifactDispatcher.from(parentScope, artifact);
      this._dispatchEvent("video", { artifact: artifactDispatcher });
    };
    this.addObjectListener(import_browserContext.BrowserContext.Events.VideoStarted, onVideo);
    for (const video of context._browser._idToVideo.values()) {
      if (video.context === context)
        onVideo(video.artifact);
    }
    for (const page of context.pages())
      this._dispatchEvent("page", { page: import_pageDispatcher.PageDispatcher.from(this, page) });
    this.addObjectListener(import_browserContext.BrowserContext.Events.Page, (page) => {
      this._dispatchEvent("page", { page: import_pageDispatcher.PageDispatcher.from(this, page) });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.Close, () => {
      this._dispatchEvent("close");
      this._dispose();
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.PageError, (error, page) => {
      this._dispatchEvent("pageError", { error: (0, import_errors.serializeError)(error), page: import_pageDispatcher.PageDispatcher.from(this, page) });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.Console, (message) => {
      const page = message.page();
      if (this._shouldDispatchEvent(page, "console")) {
        const pageDispatcher = import_pageDispatcher.PageDispatcher.from(this, page);
        this._dispatchEvent("console", {
          page: pageDispatcher,
          type: message.type(),
          text: message.text(),
          args: message.args().map((a) => import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(pageDispatcher, a)),
          location: message.location()
        });
      }
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.Dialog, (dialog) => {
      if (this._shouldDispatchEvent(dialog.page(), "dialog"))
        this._dispatchEvent("dialog", { dialog: new import_dialogDispatcher.DialogDispatcher(this, dialog) });
      else
        dialog.close().catch(() => {
        });
    });
    if (context._browser.options.name === "chromium") {
      for (const page of context.backgroundPages())
        this._dispatchEvent("backgroundPage", { page: import_pageDispatcher.PageDispatcher.from(this, page) });
      this.addObjectListener(import_crBrowser.CRBrowserContext.CREvents.BackgroundPage, (page) => this._dispatchEvent("backgroundPage", { page: import_pageDispatcher.PageDispatcher.from(this, page) }));
      for (const serviceWorker of context.serviceWorkers())
        this._dispatchEvent("serviceWorker", { worker: new import_pageDispatcher.WorkerDispatcher(this, serviceWorker) });
      this.addObjectListener(import_crBrowser.CRBrowserContext.CREvents.ServiceWorker, (serviceWorker) => this._dispatchEvent("serviceWorker", { worker: new import_pageDispatcher.WorkerDispatcher(this, serviceWorker) }));
    }
    this.addObjectListener(import_browserContext.BrowserContext.Events.Request, (request) => {
      const redirectFromDispatcher = request.redirectedFrom() && (0, import_dispatcher.existingDispatcher)(request.redirectedFrom());
      if (!redirectFromDispatcher && !this._shouldDispatchNetworkEvent(request, "request") && !request.isNavigationRequest())
        return;
      const requestDispatcher = import_networkDispatchers.RequestDispatcher.from(this, request);
      this._dispatchEvent("request", {
        request: requestDispatcher,
        page: import_pageDispatcher.PageDispatcher.fromNullable(this, request.frame()?._page.initializedOrUndefined())
      });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.Response, (response) => {
      const requestDispatcher = (0, import_dispatcher.existingDispatcher)(response.request());
      if (!requestDispatcher && !this._shouldDispatchNetworkEvent(response.request(), "response"))
        return;
      this._dispatchEvent("response", {
        response: import_networkDispatchers.ResponseDispatcher.from(this, response),
        page: import_pageDispatcher.PageDispatcher.fromNullable(this, response.frame()?._page.initializedOrUndefined())
      });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.RequestFailed, (request) => {
      const requestDispatcher = (0, import_dispatcher.existingDispatcher)(request);
      if (!requestDispatcher && !this._shouldDispatchNetworkEvent(request, "requestFailed"))
        return;
      this._dispatchEvent("requestFailed", {
        request: import_networkDispatchers.RequestDispatcher.from(this, request),
        failureText: request._failureText || void 0,
        responseEndTiming: request._responseEndTiming,
        page: import_pageDispatcher.PageDispatcher.fromNullable(this, request.frame()?._page.initializedOrUndefined())
      });
    });
    this.addObjectListener(import_browserContext.BrowserContext.Events.RequestFinished, ({ request, response }) => {
      const requestDispatcher = (0, import_dispatcher.existingDispatcher)(request);
      if (!requestDispatcher && !this._shouldDispatchNetworkEvent(request, "requestFinished"))
        return;
      this._dispatchEvent("requestFinished", {
        request: import_networkDispatchers.RequestDispatcher.from(this, request),
        response: import_networkDispatchers.ResponseDispatcher.fromNullable(this, response),
        responseEndTiming: request._responseEndTiming,
        page: import_pageDispatcher.PageDispatcher.fromNullable(this, request.frame()?._page.initializedOrUndefined())
      });
    });
  }
  _shouldDispatchNetworkEvent(request, event) {
    return this._shouldDispatchEvent(request.frame()?._page?.initializedOrUndefined(), event);
  }
  _shouldDispatchEvent(page, event) {
    if (this._subscriptions.has(event))
      return true;
    const pageDispatcher = page ? (0, import_dispatcher.existingDispatcher)(page) : void 0;
    if (pageDispatcher?._subscriptions.has(event))
      return true;
    return false;
  }
  async createTempFiles(params) {
    const dir = this._context._browser.options.artifactsDir;
    const tmpDir = import_path.default.join(dir, "upload-" + (0, import_crypto.createGuid)());
    const tempDirWithRootName = params.rootDirName ? import_path.default.join(tmpDir, import_path.default.basename(params.rootDirName)) : tmpDir;
    await import_fs.default.promises.mkdir(tempDirWithRootName, { recursive: true });
    this._context._tempDirs.push(tmpDir);
    return {
      rootDir: params.rootDirName ? new import_writableStreamDispatcher.WritableStreamDispatcher(this, tempDirWithRootName) : void 0,
      writableStreams: await Promise.all(params.items.map(async (item) => {
        await import_fs.default.promises.mkdir(import_path.default.dirname(import_path.default.join(tempDirWithRootName, item.name)), { recursive: true });
        const file = import_fs.default.createWriteStream(import_path.default.join(tempDirWithRootName, item.name));
        return new import_writableStreamDispatcher.WritableStreamDispatcher(this, file, item.lastModifiedMs);
      }))
    };
  }
  async setDefaultNavigationTimeoutNoReply(params) {
    this._context.setDefaultNavigationTimeout(params.timeout);
  }
  async setDefaultTimeoutNoReply(params) {
    this._context.setDefaultTimeout(params.timeout);
  }
  async exposeBinding(params) {
    await this._context.exposeBinding(params.name, !!params.needsHandle, (source, ...args) => {
      if (this._disposed)
        return;
      const pageDispatcher = import_pageDispatcher.PageDispatcher.from(this, source.page);
      const binding = new import_pageDispatcher.BindingCallDispatcher(pageDispatcher, params.name, !!params.needsHandle, source, args);
      this._dispatchEvent("bindingCall", { binding });
      return binding.promise();
    });
  }
  async newPage(params, metadata) {
    return { page: import_pageDispatcher.PageDispatcher.from(this, await this._context.newPage(metadata)) };
  }
  async cookies(params) {
    return { cookies: await this._context.cookies(params.urls) };
  }
  async addCookies(params) {
    await this._context.addCookies(params.cookies);
  }
  async clearCookies(params) {
    const nameRe = params.nameRegexSource !== void 0 && params.nameRegexFlags !== void 0 ? new RegExp(params.nameRegexSource, params.nameRegexFlags) : void 0;
    const domainRe = params.domainRegexSource !== void 0 && params.domainRegexFlags !== void 0 ? new RegExp(params.domainRegexSource, params.domainRegexFlags) : void 0;
    const pathRe = params.pathRegexSource !== void 0 && params.pathRegexFlags !== void 0 ? new RegExp(params.pathRegexSource, params.pathRegexFlags) : void 0;
    await this._context.clearCookies({
      name: nameRe || params.name,
      domain: domainRe || params.domain,
      path: pathRe || params.path
    });
  }
  async grantPermissions(params) {
    await this._context.grantPermissions(params.permissions, params.origin);
  }
  async clearPermissions() {
    await this._context.clearPermissions();
  }
  async setGeolocation(params) {
    await this._context.setGeolocation(params.geolocation);
  }
  async setExtraHTTPHeaders(params) {
    await this._context.setExtraHTTPHeaders(params.headers);
  }
  async setOffline(params) {
    await this._context.setOffline(params.offline);
  }
  async setHTTPCredentials(params) {
    await this._context.setHTTPCredentials(params.httpCredentials);
  }
  async addInitScript(params) {
    await this._context.addInitScript(params.source);
  }
  async setNetworkInterceptionPatterns(params) {
    if (!params.patterns.length) {
      await this._context.setRequestInterceptor(void 0);
      return;
    }
    const urlMatchers = params.patterns.map((pattern) => pattern.regexSource ? new RegExp(pattern.regexSource, pattern.regexFlags) : pattern.glob);
    await this._context.setRequestInterceptor((route, request) => {
      const matchesSome = urlMatchers.some((urlMatch) => (0, import_urlMatch.urlMatches)(this._context._options.baseURL, request.url(), urlMatch));
      if (!matchesSome)
        return false;
      this._dispatchEvent("route", { route: import_networkDispatchers.RouteDispatcher.from(import_networkDispatchers.RequestDispatcher.from(this, request), route) });
      return true;
    });
  }
  async setWebSocketInterceptionPatterns(params, metadata) {
    this._webSocketInterceptionPatterns = params.patterns;
    if (params.patterns.length)
      await import_webSocketRouteDispatcher.WebSocketRouteDispatcher.installIfNeeded(this._context);
  }
  async storageState(params, metadata) {
    return await this._context.storageState(params.indexedDB);
  }
  async close(params, metadata) {
    metadata.potentiallyClosesScope = true;
    await this._context.close(params);
  }
  async enableRecorder(params) {
    await import_recorder.Recorder.show(this._context, import_recorderApp.RecorderApp.factory(this._context), params);
  }
  async pause(params, metadata) {
  }
  async newCDPSession(params) {
    if (!this._object._browser.options.isChromium)
      throw new Error(`CDP session is only available in Chromium`);
    if (!params.page && !params.frame || params.page && params.frame)
      throw new Error(`CDP session must be initiated with either Page or Frame, not none or both`);
    const crBrowserContext = this._object;
    return { session: new import_cdpSessionDispatcher.CDPSessionDispatcher(this, await crBrowserContext.newCDPSession((params.page ? params.page : params.frame)._object)) };
  }
  async harStart(params) {
    const harId = await this._context._harStart(params.page ? params.page._object : null, params.options);
    return { harId };
  }
  async harExport(params) {
    const artifact = await this._context._harExport(params.harId);
    if (!artifact)
      throw new Error("No HAR artifact. Ensure record.harPath is set.");
    return { artifact: import_artifactDispatcher.ArtifactDispatcher.from(this, artifact) };
  }
  async clockFastForward(params, metadata) {
    await this._context.clock.fastForward(params.ticksString ?? params.ticksNumber ?? 0);
  }
  async clockInstall(params, metadata) {
    await this._context.clock.install(params.timeString ?? params.timeNumber ?? void 0);
  }
  async clockPauseAt(params, metadata) {
    await this._context.clock.pauseAt(params.timeString ?? params.timeNumber ?? 0);
  }
  async clockResume(params, metadata) {
    await this._context.clock.resume();
  }
  async clockRunFor(params, metadata) {
    await this._context.clock.runFor(params.ticksString ?? params.ticksNumber ?? 0);
  }
  async clockSetFixedTime(params, metadata) {
    await this._context.clock.setFixedTime(params.timeString ?? params.timeNumber ?? 0);
  }
  async clockSetSystemTime(params, metadata) {
    await this._context.clock.setSystemTime(params.timeString ?? params.timeNumber ?? 0);
  }
  async updateSubscription(params) {
    if (params.enabled)
      this._subscriptions.add(params.event);
    else
      this._subscriptions.delete(params.event);
  }
  _onDispose() {
    if (!this._context.isClosingOrClosed())
      this._context.setRequestInterceptor(void 0).catch(() => {
      });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserContextDispatcher
});

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
var pageDispatcher_exports = {};
__export(pageDispatcher_exports, {
  BindingCallDispatcher: () => BindingCallDispatcher,
  PageDispatcher: () => PageDispatcher,
  WorkerDispatcher: () => WorkerDispatcher
});
module.exports = __toCommonJS(pageDispatcher_exports);
var import_page = require("../page");
var import_dispatcher = require("./dispatcher");
var import_errors = require("../errors");
var import_artifactDispatcher = require("./artifactDispatcher");
var import_elementHandlerDispatcher = require("./elementHandlerDispatcher");
var import_frameDispatcher = require("./frameDispatcher");
var import_jsHandleDispatcher = require("./jsHandleDispatcher");
var import_networkDispatchers = require("./networkDispatchers");
var import_networkDispatchers2 = require("./networkDispatchers");
var import_networkDispatchers3 = require("./networkDispatchers");
var import_webSocketRouteDispatcher = require("./webSocketRouteDispatcher");
var import_crypto = require("../utils/crypto");
var import_urlMatch = require("../../utils/isomorphic/urlMatch");
class PageDispatcher extends import_dispatcher.Dispatcher {
  constructor(parentScope, page) {
    const mainFrame = import_frameDispatcher.FrameDispatcher.from(parentScope, page.mainFrame());
    super(parentScope, page, "Page", {
      mainFrame,
      viewportSize: page.viewportSize() || void 0,
      isClosed: page.isClosed(),
      opener: PageDispatcher.fromNullable(parentScope, page.opener())
    });
    this._type_EventTarget = true;
    this._type_Page = true;
    this._subscriptions = /* @__PURE__ */ new Set();
    this._webSocketInterceptionPatterns = [];
    this.adopt(mainFrame);
    this._page = page;
    this.addObjectListener(import_page.Page.Events.Close, () => {
      this._dispatchEvent("close");
      this._dispose();
    });
    this.addObjectListener(import_page.Page.Events.Crash, () => this._dispatchEvent("crash"));
    this.addObjectListener(import_page.Page.Events.Download, (download) => {
      this._dispatchEvent("download", { url: download.url, suggestedFilename: download.suggestedFilename(), artifact: import_artifactDispatcher.ArtifactDispatcher.from(parentScope, download.artifact) });
    });
    this.addObjectListener(import_page.Page.Events.FileChooser, (fileChooser) => this._dispatchEvent("fileChooser", {
      element: import_elementHandlerDispatcher.ElementHandleDispatcher.from(mainFrame, fileChooser.element()),
      isMultiple: fileChooser.isMultiple()
    }));
    this.addObjectListener(import_page.Page.Events.FrameAttached, (frame) => this._onFrameAttached(frame));
    this.addObjectListener(import_page.Page.Events.FrameDetached, (frame) => this._onFrameDetached(frame));
    this.addObjectListener(import_page.Page.Events.LocatorHandlerTriggered, (uid) => this._dispatchEvent("locatorHandlerTriggered", { uid }));
    this.addObjectListener(import_page.Page.Events.WebSocket, (webSocket) => this._dispatchEvent("webSocket", { webSocket: new import_networkDispatchers3.WebSocketDispatcher(this, webSocket) }));
    this.addObjectListener(import_page.Page.Events.Worker, (worker) => this._dispatchEvent("worker", { worker: new WorkerDispatcher(this, worker) }));
    this.addObjectListener(import_page.Page.Events.Video, (artifact) => this._dispatchEvent("video", { artifact: import_artifactDispatcher.ArtifactDispatcher.from(parentScope, artifact) }));
    if (page._video)
      this._dispatchEvent("video", { artifact: import_artifactDispatcher.ArtifactDispatcher.from(this.parentScope(), page._video) });
    const frames = page._frameManager.frames();
    for (let i = 1; i < frames.length; i++)
      this._onFrameAttached(frames[i]);
  }
  static from(parentScope, page) {
    return PageDispatcher.fromNullable(parentScope, page);
  }
  static fromNullable(parentScope, page) {
    if (!page)
      return void 0;
    const result = (0, import_dispatcher.existingDispatcher)(page);
    return result || new PageDispatcher(parentScope, page);
  }
  page() {
    return this._page;
  }
  async setDefaultNavigationTimeoutNoReply(params, metadata) {
    this._page.setDefaultNavigationTimeout(params.timeout);
  }
  async setDefaultTimeoutNoReply(params, metadata) {
    this._page.setDefaultTimeout(params.timeout);
  }
  async exposeBinding(params, metadata) {
    await this._page.exposeBinding(params.name, !!params.needsHandle, (source, ...args) => {
      if (this._disposed)
        return;
      const binding = new BindingCallDispatcher(this, params.name, !!params.needsHandle, source, args);
      this._dispatchEvent("bindingCall", { binding });
      return binding.promise();
    });
  }
  async setExtraHTTPHeaders(params, metadata) {
    await this._page.setExtraHTTPHeaders(params.headers);
  }
  async reload(params, metadata) {
    return { response: import_networkDispatchers2.ResponseDispatcher.fromNullable(this.parentScope(), await this._page.reload(metadata, params)) };
  }
  async goBack(params, metadata) {
    return { response: import_networkDispatchers2.ResponseDispatcher.fromNullable(this.parentScope(), await this._page.goBack(metadata, params)) };
  }
  async goForward(params, metadata) {
    return { response: import_networkDispatchers2.ResponseDispatcher.fromNullable(this.parentScope(), await this._page.goForward(metadata, params)) };
  }
  async requestGC(params, metadata) {
    await this._page.requestGC();
  }
  async registerLocatorHandler(params, metadata) {
    const uid = this._page.registerLocatorHandler(params.selector, params.noWaitAfter);
    return { uid };
  }
  async resolveLocatorHandlerNoReply(params, metadata) {
    this._page.resolveLocatorHandler(params.uid, params.remove);
  }
  async unregisterLocatorHandler(params, metadata) {
    this._page.unregisterLocatorHandler(params.uid);
  }
  async emulateMedia(params, metadata) {
    await this._page.emulateMedia({
      media: params.media,
      colorScheme: params.colorScheme,
      reducedMotion: params.reducedMotion,
      forcedColors: params.forcedColors,
      contrast: params.contrast
    });
  }
  async setViewportSize(params, metadata) {
    await this._page.setViewportSize(params.viewportSize);
  }
  async addInitScript(params, metadata) {
    await this._page.addInitScript(params.source);
  }
  async setNetworkInterceptionPatterns(params, metadata) {
    if (!params.patterns.length) {
      await this._page.setClientRequestInterceptor(void 0);
      return;
    }
    const urlMatchers = params.patterns.map((pattern) => pattern.regexSource ? new RegExp(pattern.regexSource, pattern.regexFlags) : pattern.glob);
    await this._page.setClientRequestInterceptor((route, request) => {
      const matchesSome = urlMatchers.some((urlMatch) => (0, import_urlMatch.urlMatches)(this._page._browserContext._options.baseURL, request.url(), urlMatch));
      if (!matchesSome)
        return false;
      this._dispatchEvent("route", { route: import_networkDispatchers3.RouteDispatcher.from(import_networkDispatchers.RequestDispatcher.from(this.parentScope(), request), route) });
      return true;
    });
  }
  async setWebSocketInterceptionPatterns(params, metadata) {
    this._webSocketInterceptionPatterns = params.patterns;
    if (params.patterns.length)
      await import_webSocketRouteDispatcher.WebSocketRouteDispatcher.installIfNeeded(this._page);
  }
  async expectScreenshot(params, metadata) {
    const mask = (params.mask || []).map(({ frame, selector }) => ({
      frame: frame._object,
      selector
    }));
    const locator = params.locator ? {
      frame: params.locator.frame._object,
      selector: params.locator.selector
    } : void 0;
    return await this._page.expectScreenshot(metadata, {
      ...params,
      locator,
      mask
    });
  }
  async screenshot(params, metadata) {
    const mask = (params.mask || []).map(({ frame, selector }) => ({
      frame: frame._object,
      selector
    }));
    return { binary: await this._page.screenshot(metadata, { ...params, mask }) };
  }
  async close(params, metadata) {
    if (!params.runBeforeUnload)
      metadata.potentiallyClosesScope = true;
    await this._page.close(metadata, params);
  }
  async updateSubscription(params) {
    if (params.event === "fileChooser")
      await this._page.setFileChooserIntercepted(params.enabled);
    if (params.enabled)
      this._subscriptions.add(params.event);
    else
      this._subscriptions.delete(params.event);
  }
  async keyboardDown(params, metadata) {
    await this._page.keyboard.down(params.key);
  }
  async keyboardUp(params, metadata) {
    await this._page.keyboard.up(params.key);
  }
  async keyboardInsertText(params, metadata) {
    await this._page.keyboard.insertText(params.text);
  }
  async keyboardType(params, metadata) {
    await this._page.keyboard.type(params.text, params);
  }
  async keyboardPress(params, metadata) {
    await this._page.keyboard.press(params.key, params);
  }
  async mouseMove(params, metadata) {
    await this._page.mouse.move(params.x, params.y, params, metadata);
  }
  async mouseDown(params, metadata) {
    await this._page.mouse.down(params, metadata);
  }
  async mouseUp(params, metadata) {
    await this._page.mouse.up(params, metadata);
  }
  async mouseClick(params, metadata) {
    await this._page.mouse.click(params.x, params.y, params, metadata);
  }
  async mouseWheel(params, metadata) {
    await this._page.mouse.wheel(params.deltaX, params.deltaY);
  }
  async touchscreenTap(params, metadata) {
    await this._page.touchscreen.tap(params.x, params.y, metadata);
  }
  async accessibilitySnapshot(params, metadata) {
    const rootAXNode = await this._page.accessibility.snapshot({
      interestingOnly: params.interestingOnly,
      root: params.root ? params.root._elementHandle : void 0
    });
    return { rootAXNode: rootAXNode || void 0 };
  }
  async pdf(params, metadata) {
    if (!this._page.pdf)
      throw new Error("PDF generation is only supported for Headless Chromium");
    const buffer = await this._page.pdf(params);
    return { pdf: buffer };
  }
  async bringToFront(params, metadata) {
    await this._page.bringToFront();
  }
  async startJSCoverage(params, metadata) {
    const coverage = this._page.coverage;
    await coverage.startJSCoverage(params);
  }
  async stopJSCoverage(params, metadata) {
    const coverage = this._page.coverage;
    return await coverage.stopJSCoverage();
  }
  async startCSSCoverage(params, metadata) {
    const coverage = this._page.coverage;
    await coverage.startCSSCoverage(params);
  }
  async stopCSSCoverage(params, metadata) {
    const coverage = this._page.coverage;
    return await coverage.stopCSSCoverage();
  }
  _onFrameAttached(frame) {
    this._dispatchEvent("frameAttached", { frame: import_frameDispatcher.FrameDispatcher.from(this.parentScope(), frame) });
  }
  _onFrameDetached(frame) {
    this._dispatchEvent("frameDetached", { frame: import_frameDispatcher.FrameDispatcher.from(this.parentScope(), frame) });
  }
  _onDispose() {
    if (!this._page.isClosedOrClosingOrCrashed())
      this._page.setClientRequestInterceptor(void 0).catch(() => {
      });
  }
}
class WorkerDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, worker) {
    super(scope, worker, "Worker", {
      url: worker.url()
    });
    this._type_Worker = true;
    this.addObjectListener(import_page.Worker.Events.Close, () => this._dispatchEvent("close"));
  }
  static fromNullable(scope, worker) {
    if (!worker)
      return void 0;
    const result = (0, import_dispatcher.existingDispatcher)(worker);
    return result || new WorkerDispatcher(scope, worker);
  }
  async evaluateExpression(params, metadata) {
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await this._object.evaluateExpression(params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg))) };
  }
  async evaluateExpressionHandle(params, metadata) {
    return { handle: import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(this, await this._object.evaluateExpressionHandle(params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg))) };
  }
}
class BindingCallDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, name, needsHandle, source, args) {
    super(scope, { guid: "bindingCall@" + (0, import_crypto.createGuid)() }, "BindingCall", {
      frame: import_frameDispatcher.FrameDispatcher.from(scope.parentScope(), source.frame),
      name,
      args: needsHandle ? void 0 : args.map(import_jsHandleDispatcher.serializeResult),
      handle: needsHandle ? import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(scope, args[0]) : void 0
    });
    this._type_BindingCall = true;
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }
  promise() {
    return this._promise;
  }
  async resolve(params, metadata) {
    this._resolve((0, import_jsHandleDispatcher.parseArgument)(params.result));
    this._dispose();
  }
  async reject(params, metadata) {
    this._reject((0, import_errors.parseError)(params.error));
    this._dispose();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BindingCallDispatcher,
  PageDispatcher,
  WorkerDispatcher
});

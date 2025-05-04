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
var page_exports = {};
__export(page_exports, {
  InitScript: () => InitScript,
  Page: () => Page,
  PageBinding: () => PageBinding,
  Worker: () => Worker,
  kBuiltinsScript: () => kBuiltinsScript
});
module.exports = __toCommonJS(page_exports);
var accessibility = __toESM(require("./accessibility"));
var import_browserContext = require("./browserContext");
var import_console = require("./console");
var import_errors = require("./errors");
var import_fileChooser = require("./fileChooser");
var frames = __toESM(require("./frames"));
var import_helper = require("./helper");
var input = __toESM(require("./input"));
var import_instrumentation = require("./instrumentation");
var import_builtins = require("../utils/isomorphic/builtins");
var import_pageBinding = require("./pageBinding");
var js = __toESM(require("./javascript"));
var import_progress = require("./progress");
var import_screenshotter = require("./screenshotter");
var import_timeoutSettings = require("./timeoutSettings");
var import_utils = require("../utils");
var import_crypto = require("./utils/crypto");
var import_utils2 = require("../utils");
var import_comparators = require("./utils/comparators");
var import_debugLogger = require("./utils/debugLogger");
var import_selectorParser = require("../utils/isomorphic/selectorParser");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
var import_callLog = require("./callLog");
class Page extends import_instrumentation.SdkObject {
  constructor(delegate, browserContext) {
    super(browserContext, "page");
    this._closedState = "open";
    this._closedPromise = new import_manualPromise.ManualPromise();
    this._initializedPromise = new import_manualPromise.ManualPromise();
    this._eventsToEmitAfterInitialized = [];
    this._crashed = false;
    this.openScope = new import_utils.LongStandingScope();
    this._emulatedMedia = {};
    this._interceptFileChooser = false;
    this._pageBindings = /* @__PURE__ */ new Map();
    this.initScripts = [];
    this._workers = /* @__PURE__ */ new Map();
    this._video = null;
    this._isServerSideOnly = false;
    this._locatorHandlers = /* @__PURE__ */ new Map();
    this._lastLocatorHandlerUid = 0;
    this._locatorHandlerRunningCounter = 0;
    // Aiming at 25 fps by default - each frame is 40ms, but we give some slack with 35ms.
    // When throttling for tracing, 200ms between frames, except for 10 frames around the action.
    this._frameThrottler = new FrameThrottler(10, 35, 200);
    this.attribution.page = this;
    this._delegate = delegate;
    this._browserContext = browserContext;
    this.accessibility = new accessibility.Accessibility(delegate.getAccessibilityTree.bind(delegate));
    this.keyboard = new input.Keyboard(delegate.rawKeyboard);
    this.mouse = new input.Mouse(delegate.rawMouse, this);
    this.touchscreen = new input.Touchscreen(delegate.rawTouchscreen, this);
    this._timeoutSettings = new import_timeoutSettings.TimeoutSettings(browserContext._timeoutSettings);
    this._screenshotter = new import_screenshotter.Screenshotter(this);
    this._frameManager = new frames.FrameManager(this);
    if (delegate.pdf)
      this.pdf = delegate.pdf.bind(delegate);
    this.coverage = delegate.coverage ? delegate.coverage() : null;
  }
  static {
    this.Events = {
      Close: "close",
      Crash: "crash",
      Download: "download",
      FileChooser: "filechooser",
      FrameAttached: "frameattached",
      FrameDetached: "framedetached",
      InternalFrameNavigatedToNewDocument: "internalframenavigatedtonewdocument",
      LocatorHandlerTriggered: "locatorhandlertriggered",
      ScreencastFrame: "screencastframe",
      Video: "video",
      WebSocket: "websocket",
      Worker: "worker"
    };
  }
  async reportAsNew(opener, error = void 0, contextEvent = import_browserContext.BrowserContext.Events.Page) {
    if (opener) {
      const openerPageOrError = await opener.waitForInitializedOrError();
      if (openerPageOrError instanceof Page && !openerPageOrError.isClosed())
        this._opener = openerPageOrError;
    }
    this._markInitialized(error, contextEvent);
  }
  _markInitialized(error = void 0, contextEvent = import_browserContext.BrowserContext.Events.Page) {
    if (error) {
      if (this._browserContext.isClosingOrClosed())
        return;
      this._frameManager.createDummyMainFrameIfNeeded();
    }
    this._initialized = error || this;
    this.emitOnContext(contextEvent, this);
    for (const { event, args } of this._eventsToEmitAfterInitialized)
      this._browserContext.emit(event, ...args);
    this._eventsToEmitAfterInitialized = [];
    if (this.isClosed())
      this.emit(Page.Events.Close);
    else
      this.instrumentation.onPageOpen(this);
    this._initializedPromise.resolve(this._initialized);
  }
  initializedOrUndefined() {
    return this._initialized ? this : void 0;
  }
  waitForInitializedOrError() {
    return this._initializedPromise;
  }
  emitOnContext(event, ...args) {
    if (this._isServerSideOnly)
      return;
    this._browserContext.emit(event, ...args);
  }
  emitOnContextOnceInitialized(event, ...args) {
    if (this._isServerSideOnly)
      return;
    if (this._initialized)
      this._browserContext.emit(event, ...args);
    else
      this._eventsToEmitAfterInitialized.push({ event, args });
  }
  async resetForReuse(metadata) {
    this.setDefaultNavigationTimeout(void 0);
    this.setDefaultTimeout(void 0);
    this._locatorHandlers.clear();
    await this._removeExposedBindings();
    await this._removeInitScripts();
    await this.setClientRequestInterceptor(void 0);
    await this._setServerRequestInterceptor(void 0);
    await this.setFileChooserIntercepted(false);
    await this.mainFrame().goto(metadata, "about:blank");
    this._emulatedSize = void 0;
    this._emulatedMedia = {};
    this._extraHTTPHeaders = void 0;
    this._interceptFileChooser = false;
    await Promise.all([
      this._delegate.updateEmulatedViewportSize(),
      this._delegate.updateEmulateMedia(),
      this._delegate.updateFileChooserInterception()
    ]);
    await this._delegate.resetForReuse();
  }
  _didClose() {
    this._frameManager.dispose();
    this._frameThrottler.dispose();
    (0, import_utils.assert)(this._closedState !== "closed", "Page closed twice");
    this._closedState = "closed";
    this.emit(Page.Events.Close);
    this._closedPromise.resolve();
    this.instrumentation.onPageClose(this);
    this.openScope.close(new import_errors.TargetClosedError());
  }
  _didCrash() {
    this._frameManager.dispose();
    this._frameThrottler.dispose();
    this.emit(Page.Events.Crash);
    this._crashed = true;
    this.instrumentation.onPageClose(this);
    this.openScope.close(new Error("Page crashed"));
  }
  async _onFileChooserOpened(handle) {
    let multiple;
    try {
      multiple = await handle.evaluate((element) => !!element.multiple);
    } catch (e) {
      return;
    }
    if (!this.listenerCount(Page.Events.FileChooser)) {
      handle.dispose();
      return;
    }
    const fileChooser = new import_fileChooser.FileChooser(this, handle, multiple);
    this.emit(Page.Events.FileChooser, fileChooser);
  }
  context() {
    return this._browserContext;
  }
  opener() {
    return this._opener;
  }
  mainFrame() {
    return this._frameManager.mainFrame();
  }
  frames() {
    return this._frameManager.frames();
  }
  setDefaultNavigationTimeout(timeout) {
    this._timeoutSettings.setDefaultNavigationTimeout(timeout);
  }
  setDefaultTimeout(timeout) {
    this._timeoutSettings.setDefaultTimeout(timeout);
  }
  async exposeBinding(name, needsHandle, playwrightBinding) {
    if (this._pageBindings.has(name))
      throw new Error(`Function "${name}" has been already registered`);
    if (this._browserContext._pageBindings.has(name))
      throw new Error(`Function "${name}" has been already registered in the browser context`);
    const binding = new PageBinding(name, playwrightBinding, needsHandle);
    this._pageBindings.set(name, binding);
    await this._delegate.addInitScript(binding.initScript);
    await Promise.all(this.frames().map((frame) => frame.evaluateExpression(binding.initScript.source).catch((e) => {
    })));
  }
  async _removeExposedBindings() {
    for (const [key, binding] of this._pageBindings) {
      if (!binding.internal)
        this._pageBindings.delete(key);
    }
  }
  setExtraHTTPHeaders(headers) {
    this._extraHTTPHeaders = headers;
    return this._delegate.updateExtraHTTPHeaders();
  }
  extraHTTPHeaders() {
    return this._extraHTTPHeaders;
  }
  async _onBindingCalled(payload, context) {
    if (this._closedState === "closed")
      return;
    await PageBinding.dispatch(this, payload, context);
  }
  _addConsoleMessage(type, args, location, text) {
    const message = new import_console.ConsoleMessage(this, type, text, args, location);
    const intercepted = this._frameManager.interceptConsoleMessage(message);
    if (intercepted) {
      args.forEach((arg) => arg.dispose());
      return;
    }
    this.emitOnContextOnceInitialized(import_browserContext.BrowserContext.Events.Console, message);
  }
  async reload(metadata, options) {
    const controller = new import_progress.ProgressController(metadata, this);
    return controller.run((progress) => this.mainFrame().raceNavigationAction(progress, options, async () => {
      const [response] = await Promise.all([
        // Reload must be a new document, and should not be confused with a stray pushState.
        this.mainFrame()._waitForNavigation(progress, true, options),
        this._delegate.reload()
      ]);
      return response;
    }), this._timeoutSettings.navigationTimeout(options));
  }
  async goBack(metadata, options) {
    const controller = new import_progress.ProgressController(metadata, this);
    return controller.run((progress) => this.mainFrame().raceNavigationAction(progress, options, async () => {
      let error;
      const waitPromise = this.mainFrame()._waitForNavigation(progress, false, options).catch((e) => {
        error = e;
        return null;
      });
      const result = await this._delegate.goBack();
      if (!result)
        return null;
      const response = await waitPromise;
      if (error)
        throw error;
      return response;
    }), this._timeoutSettings.navigationTimeout(options));
  }
  async goForward(metadata, options) {
    const controller = new import_progress.ProgressController(metadata, this);
    return controller.run((progress) => this.mainFrame().raceNavigationAction(progress, options, async () => {
      let error;
      const waitPromise = this.mainFrame()._waitForNavigation(progress, false, options).catch((e) => {
        error = e;
        return null;
      });
      const result = await this._delegate.goForward();
      if (!result)
        return null;
      const response = await waitPromise;
      if (error)
        throw error;
      return response;
    }), this._timeoutSettings.navigationTimeout(options));
  }
  requestGC() {
    return this._delegate.requestGC();
  }
  registerLocatorHandler(selector, noWaitAfter) {
    const uid = ++this._lastLocatorHandlerUid;
    this._locatorHandlers.set(uid, { selector, noWaitAfter });
    return uid;
  }
  resolveLocatorHandler(uid, remove) {
    const handler = this._locatorHandlers.get(uid);
    if (remove)
      this._locatorHandlers.delete(uid);
    if (handler) {
      handler.resolved?.resolve();
      handler.resolved = void 0;
    }
  }
  unregisterLocatorHandler(uid) {
    this._locatorHandlers.delete(uid);
  }
  async performActionPreChecks(progress) {
    await this._performWaitForNavigationCheck(progress);
    progress.throwIfAborted();
    await this._performLocatorHandlersCheckpoint(progress);
    progress.throwIfAborted();
    await this._performWaitForNavigationCheck(progress);
  }
  async _performWaitForNavigationCheck(progress) {
    if (process.env.PLAYWRIGHT_SKIP_NAVIGATION_CHECK)
      return;
    const mainFrame = this._frameManager.mainFrame();
    if (!mainFrame || !mainFrame.pendingDocument())
      return;
    const url = mainFrame.pendingDocument()?.request?.url();
    const toUrl = url ? `" ${(0, import_utils.trimStringWithEllipsis)(url, 200)}"` : "";
    progress.log(`  waiting for${toUrl} navigation to finish...`);
    await import_helper.helper.waitForEvent(progress, mainFrame, frames.Frame.Events.InternalNavigation, (e) => {
      if (!e.isPublic)
        return false;
      if (!e.error)
        progress.log(`  navigated to "${(0, import_utils.trimStringWithEllipsis)(mainFrame.url(), 200)}"`);
      return true;
    }).promise;
  }
  async _performLocatorHandlersCheckpoint(progress) {
    if (this._locatorHandlerRunningCounter)
      return;
    for (const [uid, handler] of this._locatorHandlers) {
      if (!handler.resolved) {
        if (await this.mainFrame().isVisibleInternal(handler.selector, { strict: true })) {
          handler.resolved = new import_manualPromise.ManualPromise();
          this.emit(Page.Events.LocatorHandlerTriggered, uid);
        }
      }
      if (handler.resolved) {
        ++this._locatorHandlerRunningCounter;
        progress.log(`  found ${(0, import_utils2.asLocator)(this.attribution.playwright.options.sdkLanguage, handler.selector)}, intercepting action to run the handler`);
        const promise = handler.resolved.then(async () => {
          progress.throwIfAborted();
          if (!handler.noWaitAfter) {
            progress.log(`  locator handler has finished, waiting for ${(0, import_utils2.asLocator)(this.attribution.playwright.options.sdkLanguage, handler.selector)} to be hidden`);
            await this.mainFrame().waitForSelectorInternal(progress, handler.selector, false, { state: "hidden" });
          } else {
            progress.log(`  locator handler has finished`);
          }
        });
        await this.openScope.race(promise).finally(() => --this._locatorHandlerRunningCounter);
        progress.throwIfAborted();
        progress.log(`  interception handler has finished, continuing`);
      }
    }
  }
  async emulateMedia(options) {
    if (options.media !== void 0)
      this._emulatedMedia.media = options.media;
    if (options.colorScheme !== void 0)
      this._emulatedMedia.colorScheme = options.colorScheme;
    if (options.reducedMotion !== void 0)
      this._emulatedMedia.reducedMotion = options.reducedMotion;
    if (options.forcedColors !== void 0)
      this._emulatedMedia.forcedColors = options.forcedColors;
    if (options.contrast !== void 0)
      this._emulatedMedia.contrast = options.contrast;
    await this._delegate.updateEmulateMedia();
  }
  emulatedMedia() {
    const contextOptions = this._browserContext._options;
    return {
      media: this._emulatedMedia.media || "no-override",
      colorScheme: this._emulatedMedia.colorScheme !== void 0 ? this._emulatedMedia.colorScheme : contextOptions.colorScheme ?? "light",
      reducedMotion: this._emulatedMedia.reducedMotion !== void 0 ? this._emulatedMedia.reducedMotion : contextOptions.reducedMotion ?? "no-preference",
      forcedColors: this._emulatedMedia.forcedColors !== void 0 ? this._emulatedMedia.forcedColors : contextOptions.forcedColors ?? "none",
      contrast: this._emulatedMedia.contrast !== void 0 ? this._emulatedMedia.contrast : contextOptions.contrast ?? "no-preference"
    };
  }
  async setViewportSize(viewportSize) {
    this._emulatedSize = { viewport: { ...viewportSize }, screen: { ...viewportSize } };
    await this._delegate.updateEmulatedViewportSize();
  }
  viewportSize() {
    return this.emulatedSize()?.viewport || null;
  }
  emulatedSize() {
    if (this._emulatedSize)
      return this._emulatedSize;
    const contextOptions = this._browserContext._options;
    return contextOptions.viewport ? { viewport: contextOptions.viewport, screen: contextOptions.screen || contextOptions.viewport } : null;
  }
  async bringToFront() {
    await this._delegate.bringToFront();
  }
  async addInitScript(source, name) {
    const initScript = new InitScript(source, false, name);
    this.initScripts.push(initScript);
    await this._delegate.addInitScript(initScript);
  }
  async _removeInitScripts() {
    this.initScripts = this.initScripts.filter((script) => script.internal);
    await this._delegate.removeNonInternalInitScripts();
  }
  needsRequestInterception() {
    return !!this._clientRequestInterceptor || !!this._serverRequestInterceptor || !!this._browserContext._requestInterceptor;
  }
  async setClientRequestInterceptor(handler) {
    this._clientRequestInterceptor = handler;
    await this._delegate.updateRequestInterception();
  }
  async _setServerRequestInterceptor(handler) {
    this._serverRequestInterceptor = handler;
    await this._delegate.updateRequestInterception();
  }
  async expectScreenshot(metadata, options = {}) {
    const locator = options.locator;
    const rafrafScreenshot = locator ? async (progress, timeout) => {
      return await locator.frame.rafrafTimeoutScreenshotElementWithProgress(progress, locator.selector, timeout, options || {});
    } : async (progress, timeout) => {
      await this.performActionPreChecks(progress);
      await this.mainFrame().rafrafTimeout(timeout);
      return await this._screenshotter.screenshotPage(progress, options || {});
    };
    const comparator = (0, import_comparators.getComparator)("image/png");
    const controller = new import_progress.ProgressController(metadata, this);
    if (!options.expected && options.isNot)
      return { errorMessage: '"not" matcher requires expected result' };
    try {
      const format = (0, import_screenshotter.validateScreenshotOptions)(options || {});
      if (format !== "png")
        throw new Error("Only PNG screenshots are supported");
    } catch (error) {
      return { errorMessage: error.message };
    }
    let intermediateResult = void 0;
    const areEqualScreenshots = (actual, expected, previous) => {
      const comparatorResult = actual && expected ? comparator(actual, expected, options) : void 0;
      if (comparatorResult !== void 0 && !!comparatorResult === !!options.isNot)
        return true;
      if (comparatorResult)
        intermediateResult = { errorMessage: comparatorResult.errorMessage, diff: comparatorResult.diff, actual, previous };
      return false;
    };
    const callTimeout = this._timeoutSettings.timeout(options);
    return controller.run(async (progress) => {
      let actual;
      let previous;
      const pollIntervals = [0, 100, 250, 500];
      progress.log(`${metadata.apiName}${callTimeout ? ` with timeout ${callTimeout}ms` : ""}`);
      if (options.expected)
        progress.log(`  verifying given screenshot expectation`);
      else
        progress.log(`  generating new stable screenshot expectation`);
      let isFirstIteration = true;
      while (true) {
        progress.throwIfAborted();
        if (this.isClosed())
          throw new Error("The page has closed");
        const screenshotTimeout = pollIntervals.shift() ?? 1e3;
        if (screenshotTimeout)
          progress.log(`waiting ${screenshotTimeout}ms before taking screenshot`);
        previous = actual;
        actual = await rafrafScreenshot(progress, screenshotTimeout).catch((e) => {
          progress.log(`failed to take screenshot - ` + e.message);
          return void 0;
        });
        if (!actual)
          continue;
        const expectation = options.expected && isFirstIteration ? options.expected : previous;
        if (areEqualScreenshots(actual, expectation, previous))
          break;
        if (intermediateResult)
          progress.log(intermediateResult.errorMessage);
        isFirstIteration = false;
      }
      if (!isFirstIteration)
        progress.log(`captured a stable screenshot`);
      if (!options.expected)
        return { actual };
      if (isFirstIteration) {
        progress.log(`screenshot matched expectation`);
        return {};
      }
      if (areEqualScreenshots(actual, options.expected, void 0)) {
        progress.log(`screenshot matched expectation`);
        return {};
      }
      throw new Error(intermediateResult.errorMessage);
    }, callTimeout).catch((e) => {
      if (js.isJavaScriptErrorInEvaluate(e) || (0, import_selectorParser.isInvalidSelectorError)(e))
        throw e;
      let errorMessage = e.message;
      if (e instanceof import_errors.TimeoutError && intermediateResult?.previous)
        errorMessage = `Failed to take two consecutive stable screenshots.`;
      return {
        log: (0, import_callLog.compressCallLog)(e.message ? [...metadata.log, e.message] : metadata.log),
        ...intermediateResult,
        errorMessage,
        timedOut: e instanceof import_errors.TimeoutError
      };
    });
  }
  async screenshot(metadata, options = {}) {
    const controller = new import_progress.ProgressController(metadata, this);
    return controller.run(
      (progress) => this._screenshotter.screenshotPage(progress, options),
      this._timeoutSettings.timeout(options)
    );
  }
  async close(metadata, options = {}) {
    if (this._closedState === "closed")
      return;
    if (options.reason)
      this._closeReason = options.reason;
    const runBeforeUnload = !!options.runBeforeUnload;
    if (this._closedState !== "closing") {
      this._closedState = "closing";
      await this._delegate.closePage(runBeforeUnload).catch((e) => import_debugLogger.debugLogger.log("error", e));
    }
    if (!runBeforeUnload)
      await this._closedPromise;
    if (this._ownedContext)
      await this._ownedContext.close(options);
  }
  isClosed() {
    return this._closedState === "closed";
  }
  hasCrashed() {
    return this._crashed;
  }
  isClosedOrClosingOrCrashed() {
    return this._closedState !== "open" || this._crashed;
  }
  _addWorker(workerId, worker) {
    this._workers.set(workerId, worker);
    this.emit(Page.Events.Worker, worker);
  }
  _removeWorker(workerId) {
    const worker = this._workers.get(workerId);
    if (!worker)
      return;
    worker.didClose();
    this._workers.delete(workerId);
  }
  _clearWorkers() {
    for (const [workerId, worker] of this._workers) {
      worker.didClose();
      this._workers.delete(workerId);
    }
  }
  async setFileChooserIntercepted(enabled) {
    this._interceptFileChooser = enabled;
    await this._delegate.updateFileChooserInterception();
  }
  fileChooserIntercepted() {
    return this._interceptFileChooser;
  }
  frameNavigatedToNewDocument(frame) {
    this.emit(Page.Events.InternalFrameNavigatedToNewDocument, frame);
    const origin = frame.origin();
    if (origin)
      this._browserContext.addVisitedOrigin(origin);
  }
  allInitScripts() {
    const bindings = [...this._browserContext._pageBindings.values(), ...this._pageBindings.values()];
    return [kBuiltinsScript, ...bindings.map((binding) => binding.initScript), ...this._browserContext.initScripts, ...this.initScripts];
  }
  getBinding(name) {
    return this._pageBindings.get(name) || this._browserContext._pageBindings.get(name);
  }
  setScreencastOptions(options) {
    this._delegate.setScreencastOptions(options).catch((e) => import_debugLogger.debugLogger.log("error", e));
    this._frameThrottler.setThrottlingEnabled(!!options);
  }
  throttleScreencastFrameAck(ack) {
    this._frameThrottler.ack(ack);
  }
  temporarilyDisableTracingScreencastThrottling() {
    this._frameThrottler.recharge();
  }
  async safeNonStallingEvaluateInAllFrames(expression, world, options = {}) {
    await Promise.all(this.frames().map(async (frame) => {
      try {
        await frame.nonStallingEvaluateInExistingContext(expression, world);
      } catch (e) {
        if (options.throwOnJSErrors && js.isJavaScriptErrorInEvaluate(e))
          throw e;
      }
    }));
  }
  async hideHighlight() {
    await Promise.all(this.frames().map((frame) => frame.hideHighlight().catch(() => {
    })));
  }
  markAsServerSideOnly() {
    this._isServerSideOnly = true;
  }
}
class Worker extends import_instrumentation.SdkObject {
  constructor(parent, url) {
    super(parent, "worker");
    this._existingExecutionContext = null;
    this.openScope = new import_utils.LongStandingScope();
    this._url = url;
    this._executionContextCallback = () => {
    };
    this._executionContextPromise = new Promise((x) => this._executionContextCallback = x);
  }
  static {
    this.Events = {
      Close: "close"
    };
  }
  _createExecutionContext(delegate) {
    this._existingExecutionContext = new js.ExecutionContext(this, delegate, "worker");
    this._executionContextCallback(this._existingExecutionContext);
    return this._existingExecutionContext;
  }
  url() {
    return this._url;
  }
  didClose() {
    if (this._existingExecutionContext)
      this._existingExecutionContext.contextDestroyed("Worker was closed");
    this.emit(Worker.Events.Close, this);
    this.openScope.close(new Error("Worker closed"));
  }
  async evaluateExpression(expression, isFunction, arg) {
    return js.evaluateExpression(await this._executionContextPromise, expression, { returnByValue: true, isFunction }, arg);
  }
  async evaluateExpressionHandle(expression, isFunction, arg) {
    return js.evaluateExpression(await this._executionContextPromise, expression, { returnByValue: false, isFunction }, arg);
  }
}
class PageBinding {
  static {
    this.kPlaywrightBinding = "__playwright__binding__";
  }
  constructor(name, playwrightFunction, needsHandle) {
    this.name = name;
    this.playwrightFunction = playwrightFunction;
    this.initScript = new InitScript(
      (0, import_pageBinding.createPageBindingScript)(PageBinding.kPlaywrightBinding, name, needsHandle),
      true
      /* internal */
    );
    this.needsHandle = needsHandle;
    this.internal = name.startsWith("__pw");
  }
  static async dispatch(page, payload, context) {
    const { name, seq, serializedArgs } = JSON.parse(payload);
    try {
      (0, import_utils.assert)(context.world);
      const binding = page.getBinding(name);
      if (!binding)
        throw new Error(`Function "${name}" is not exposed`);
      let result;
      if (binding.needsHandle) {
        const handle = await context.evaluateHandle(import_pageBinding.takeBindingHandle, { name, seq }).catch((e) => null);
        result = await binding.playwrightFunction({ frame: context.frame, page, context: page._browserContext }, handle);
      } else {
        if (!Array.isArray(serializedArgs))
          throw new Error(`serializedArgs is not an array. This can happen when Array.prototype.toJSON is defined incorrectly`);
        const args = serializedArgs.map((a) => js.parseEvaluationResultValue(a));
        result = await binding.playwrightFunction({ frame: context.frame, page, context: page._browserContext }, ...args);
      }
      context.evaluate(import_pageBinding.deliverBindingResult, { name, seq, result }).catch((e) => import_debugLogger.debugLogger.log("error", e));
    } catch (error) {
      context.evaluate(import_pageBinding.deliverBindingResult, { name, seq, error }).catch((e) => import_debugLogger.debugLogger.log("error", e));
    }
  }
}
class InitScript {
  constructor(source, internal, name) {
    const guid = (0, import_crypto.createGuid)();
    this.source = `(() => {
      globalThis.__pwInitScripts = globalThis.__pwInitScripts || {};
      const hasInitScript = globalThis.__pwInitScripts[${JSON.stringify(guid)}];
      if (hasInitScript)
        return;
      globalThis.__pwInitScripts[${JSON.stringify(guid)}] = true;
      ${source}
    })();`;
    this.internal = !!internal;
    this.name = name;
  }
}
const kBuiltinsScript = new InitScript(
  `(${import_builtins.builtins})()`,
  true
  /* internal */
);
class FrameThrottler {
  constructor(nonThrottledFrames, defaultInterval, throttlingInterval) {
    this._acks = [];
    this._throttlingEnabled = false;
    this._nonThrottledFrames = nonThrottledFrames;
    this._budget = nonThrottledFrames;
    this._defaultInterval = defaultInterval;
    this._throttlingInterval = throttlingInterval;
    this._tick();
  }
  dispose() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = void 0;
    }
  }
  setThrottlingEnabled(enabled) {
    this._throttlingEnabled = enabled;
  }
  recharge() {
    for (const ack of this._acks)
      ack();
    this._acks = [];
    this._budget = this._nonThrottledFrames;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._tick();
    }
  }
  ack(ack) {
    if (!this._timeoutId) {
      ack();
      return;
    }
    this._acks.push(ack);
  }
  _tick() {
    const ack = this._acks.shift();
    if (ack) {
      --this._budget;
      ack();
    }
    if (this._throttlingEnabled && this._budget <= 0) {
      this._timeoutId = setTimeout(() => this._tick(), this._throttlingInterval);
    } else {
      this._timeoutId = setTimeout(() => this._tick(), this._defaultInterval);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InitScript,
  Page,
  PageBinding,
  Worker,
  kBuiltinsScript
});

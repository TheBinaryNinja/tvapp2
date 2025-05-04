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
var recorder_exports = {};
__export(recorder_exports, {
  Recorder: () => Recorder
});
module.exports = __toCommonJS(recorder_exports);
var import_fs = __toESM(require("fs"));
var consoleApiSource = __toESM(require("../generated/consoleApiSource"));
var import_utils = require("../utils");
var import_browserContext = require("./browserContext");
var import_debugger = require("./debugger");
var import_contextRecorder = require("./recorder/contextRecorder");
var import_recorderUtils = require("./recorder/recorderUtils");
var import_locatorParser = require("../utils/isomorphic/locatorParser");
var import_selectorParser = require("../utils/isomorphic/selectorParser");
const recorderSymbol = Symbol("recorderSymbol");
class Recorder {
  constructor(context, params) {
    this._highlightedElement = {};
    this._overlayState = { offsetX: 0 };
    this._recorderApp = null;
    this._currentCallsMetadata = /* @__PURE__ */ new Map();
    this._recorderSources = [];
    this._userSources = /* @__PURE__ */ new Map();
    this._omitCallTracking = false;
    this._mode = params.mode || "none";
    this.handleSIGINT = params.handleSIGINT;
    this._contextRecorder = new import_contextRecorder.ContextRecorder(context, params, {});
    this._context = context;
    this._omitCallTracking = !!params.omitCallTracking;
    this._debugger = context.debugger();
    context.instrumentation.addListener(this, context);
    this._currentLanguage = this._contextRecorder.languageName();
    if ((0, import_utils.isUnderTest)()) {
      this._overlayState.offsetX = 200;
    }
  }
  static async showInspector(context, params, recorderAppFactory) {
    if ((0, import_utils.isUnderTest)())
      params.language = process.env.TEST_INSPECTOR_LANGUAGE;
    return await Recorder.show(context, recorderAppFactory, params);
  }
  static showInspectorNoReply(context, recorderAppFactory) {
    Recorder.showInspector(context, {}, recorderAppFactory).catch(() => {
    });
  }
  static show(context, recorderAppFactory, params) {
    let recorderPromise = context[recorderSymbol];
    if (!recorderPromise) {
      recorderPromise = Recorder._create(context, recorderAppFactory, params);
      context[recorderSymbol] = recorderPromise;
    }
    return recorderPromise;
  }
  static async _create(context, recorderAppFactory, params = {}) {
    const recorder = new Recorder(context, params);
    const recorderApp = await recorderAppFactory(recorder);
    await recorder._install(recorderApp);
    return recorder;
  }
  async _install(recorderApp) {
    this._recorderApp = recorderApp;
    recorderApp.once("close", () => {
      this._debugger.resume(false);
      this._recorderApp = null;
    });
    recorderApp.on("event", (data) => {
      if (data.event === "setMode") {
        this.setMode(data.params.mode);
        return;
      }
      if (data.event === "highlightRequested") {
        if (data.params.selector)
          this.setHighlightedSelector(this._currentLanguage, data.params.selector);
        if (data.params.ariaTemplate)
          this.setHighlightedAriaTemplate(data.params.ariaTemplate);
        return;
      }
      if (data.event === "step") {
        this._debugger.resume(true);
        return;
      }
      if (data.event === "fileChanged") {
        this._currentLanguage = this._contextRecorder.languageName(data.params.file);
        this._refreshOverlay();
        return;
      }
      if (data.event === "resume") {
        this._debugger.resume(false);
        return;
      }
      if (data.event === "pause") {
        this._debugger.pauseOnNextStatement();
        return;
      }
      if (data.event === "clear") {
        this._contextRecorder.clearScript();
        return;
      }
      if (data.event === "runTask") {
        this._contextRecorder.runTask(data.params.task);
        return;
      }
    });
    await Promise.all([
      recorderApp.setMode(this._mode),
      recorderApp.setPaused(this._debugger.isPaused()),
      this._pushAllSources()
    ]);
    this._context.once(import_browserContext.BrowserContext.Events.Close, () => {
      this._contextRecorder.dispose();
      this._context.instrumentation.removeListener(this);
      this._recorderApp?.close().catch(() => {
      });
    });
    this._contextRecorder.on(import_contextRecorder.ContextRecorder.Events.Change, (data) => {
      this._recorderSources = data.sources;
      recorderApp.setActions(data.actions, data.sources);
      recorderApp.setRunningFile(void 0);
      this._pushAllSources();
    });
    await this._context.exposeBinding("__pw_recorderState", false, async (source) => {
      let actionSelector;
      let actionPoint;
      const hasActiveScreenshotCommand = [...this._currentCallsMetadata.keys()].some(isScreenshotCommand);
      if (!hasActiveScreenshotCommand) {
        actionSelector = await this._scopeHighlightedSelectorToFrame(source.frame);
        for (const [metadata, sdkObject] of this._currentCallsMetadata) {
          if (source.page === sdkObject.attribution.page) {
            actionPoint = metadata.point || actionPoint;
            actionSelector = actionSelector || metadata.params.selector;
          }
        }
      }
      const uiState = {
        mode: this._mode,
        actionPoint,
        actionSelector,
        ariaTemplate: this._highlightedElement.ariaTemplate,
        language: this._currentLanguage,
        testIdAttributeName: this._contextRecorder.testIdAttributeName(),
        overlay: this._overlayState
      };
      return uiState;
    });
    await this._context.exposeBinding("__pw_recorderElementPicked", false, async ({ frame }, elementInfo) => {
      const selectorChain = await (0, import_contextRecorder.generateFrameSelector)(frame);
      await this._recorderApp?.elementPicked({ selector: (0, import_recorderUtils.buildFullSelector)(selectorChain, elementInfo.selector), ariaSnapshot: elementInfo.ariaSnapshot }, true);
    });
    await this._context.exposeBinding("__pw_recorderSetMode", false, async ({ frame }, mode) => {
      if (frame.parentFrame())
        return;
      this.setMode(mode);
    });
    await this._context.exposeBinding("__pw_recorderSetOverlayState", false, async ({ frame }, state) => {
      if (frame.parentFrame())
        return;
      this._overlayState = state;
    });
    await this._context.exposeBinding("__pw_resume", false, () => {
      this._debugger.resume(false);
    });
    await this._context.extendInjectedScript(consoleApiSource.source);
    await this._contextRecorder.install();
    if (this._debugger.isPaused())
      this._pausedStateChanged();
    this._debugger.on(import_debugger.Debugger.Events.PausedStateChanged, () => this._pausedStateChanged());
    this._context.recorderAppForTest = this._recorderApp;
  }
  _pausedStateChanged() {
    for (const { metadata, sdkObject } of this._debugger.pausedDetails()) {
      if (!this._currentCallsMetadata.has(metadata))
        this.onBeforeCall(sdkObject, metadata);
    }
    this._recorderApp?.setPaused(this._debugger.isPaused());
    this._updateUserSources();
    this.updateCallLog([...this._currentCallsMetadata.keys()]);
  }
  setMode(mode) {
    if (this._mode === mode)
      return;
    this._highlightedElement = {};
    this._mode = mode;
    this._recorderApp?.setMode(this._mode);
    this._contextRecorder.setEnabled(this._isRecording());
    this._debugger.setMuted(this._isRecording());
    if (this._mode !== "none" && this._mode !== "standby" && this._context.pages().length === 1)
      this._context.pages()[0].bringToFront().catch(() => {
      });
    this._refreshOverlay();
  }
  resume() {
    this._debugger.resume(false);
  }
  mode() {
    return this._mode;
  }
  setHighlightedSelector(language, selector) {
    this._highlightedElement = { selector: (0, import_locatorParser.locatorOrSelectorAsSelector)(language, selector, this._context.selectors().testIdAttributeName()) };
    this._refreshOverlay();
  }
  setHighlightedAriaTemplate(ariaTemplate) {
    this._highlightedElement = { ariaTemplate };
    this._refreshOverlay();
  }
  hideHighlightedSelector() {
    this._highlightedElement = {};
    this._refreshOverlay();
  }
  async _scopeHighlightedSelectorToFrame(frame) {
    if (!this._highlightedElement.selector)
      return;
    try {
      const mainFrame = frame._page.mainFrame();
      const resolved = await mainFrame.selectors.resolveFrameForSelector(this._highlightedElement.selector);
      if (!resolved)
        return "";
      if (resolved?.frame === mainFrame)
        return (0, import_selectorParser.stringifySelector)(resolved.info.parsed);
      if (resolved?.frame === frame)
        return (0, import_selectorParser.stringifySelector)(resolved.info.parsed);
      return "";
    } catch {
      return "";
    }
  }
  setOutput(codegenId, outputFile) {
    this._contextRecorder.setOutput(codegenId, outputFile);
  }
  _refreshOverlay() {
    for (const page of this._context.pages()) {
      for (const frame of page.frames())
        frame.evaluateExpression("window.__pw_refreshOverlay()").catch(() => {
        });
    }
  }
  async onBeforeCall(sdkObject, metadata) {
    if (this._omitCallTracking || this._isRecording())
      return;
    this._currentCallsMetadata.set(metadata, sdkObject);
    this._updateUserSources();
    this.updateCallLog([metadata]);
    if (isScreenshotCommand(metadata))
      this.hideHighlightedSelector();
    else if (metadata.params && metadata.params.selector)
      this._highlightedElement = { selector: metadata.params.selector };
  }
  async onAfterCall(sdkObject, metadata) {
    if (this._omitCallTracking || this._isRecording())
      return;
    if (!metadata.error)
      this._currentCallsMetadata.delete(metadata);
    this._updateUserSources();
    this.updateCallLog([metadata]);
  }
  _updateUserSources() {
    for (const source of this._userSources.values()) {
      source.highlight = [];
      source.revealLine = void 0;
    }
    let fileToSelect = void 0;
    for (const metadata of this._currentCallsMetadata.keys()) {
      if (!metadata.location)
        continue;
      const { file, line } = metadata.location;
      let source = this._userSources.get(file);
      if (!source) {
        source = { isRecorded: false, label: file, id: file, text: this._readSource(file), highlight: [], language: languageForFile(file) };
        this._userSources.set(file, source);
      }
      if (line) {
        const paused = this._debugger.isPaused(metadata);
        source.highlight.push({ line, type: metadata.error ? "error" : paused ? "paused" : "running" });
        source.revealLine = line;
        fileToSelect = source.id;
      }
    }
    this._pushAllSources();
    if (fileToSelect)
      this._recorderApp?.setRunningFile(fileToSelect);
  }
  _pushAllSources() {
    const primaryPage = this._context.pages()[0];
    this._recorderApp?.setSources([...this._recorderSources, ...this._userSources.values()], primaryPage?.mainFrame().url());
  }
  async onBeforeInputAction(sdkObject, metadata) {
  }
  async onCallLog(sdkObject, metadata, logName, message) {
    this.updateCallLog([metadata]);
  }
  updateCallLog(metadatas) {
    if (this._isRecording())
      return;
    const logs = [];
    for (const metadata of metadatas) {
      if (!metadata.method || metadata.internal)
        continue;
      let status = "done";
      if (this._currentCallsMetadata.has(metadata))
        status = "in-progress";
      if (this._debugger.isPaused(metadata))
        status = "paused";
      logs.push((0, import_recorderUtils.metadataToCallLog)(metadata, status));
    }
    this._recorderApp?.updateCallLogs(logs);
  }
  _isRecording() {
    return ["recording", "assertingText", "assertingVisibility", "assertingValue", "assertingSnapshot"].includes(this._mode);
  }
  _readSource(fileName) {
    try {
      return import_fs.default.readFileSync(fileName, "utf-8");
    } catch (e) {
      return "// No source available";
    }
  }
}
function isScreenshotCommand(metadata) {
  return metadata.method.toLowerCase().includes("screenshot");
}
function languageForFile(file) {
  if (file.endsWith(".py"))
    return "python";
  if (file.endsWith(".java"))
    return "java";
  if (file.endsWith(".cs"))
    return "csharp";
  return "javascript";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Recorder
});

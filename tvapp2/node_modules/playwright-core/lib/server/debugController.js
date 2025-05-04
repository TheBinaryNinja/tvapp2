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
var debugController_exports = {};
__export(debugController_exports, {
  DebugController: () => DebugController
});
module.exports = __toCommonJS(debugController_exports);
var import_instrumentation = require("./instrumentation");
var import_processLauncher = require("./utils/processLauncher");
var import_recorder = require("./recorder");
var import_utils = require("../utils");
var import_ariaSnapshot = require("../utils/isomorphic/ariaSnapshot");
var import_utilsBundle = require("../utilsBundle");
var import_recorderApp = require("./recorder/recorderApp");
var import_locatorParser = require("../utils/isomorphic/locatorParser");
const internalMetadata = (0, import_instrumentation.serverSideCallMetadata)();
class DebugController extends import_instrumentation.SdkObject {
  constructor(playwright) {
    super({ attribution: { isInternalPlaywright: true }, instrumentation: (0, import_instrumentation.createInstrumentation)() }, void 0, "DebugController");
    this._sdkLanguage = "javascript";
    this._codegenId = "playwright-test";
    this._playwright = playwright;
  }
  static {
    this.Events = {
      StateChanged: "stateChanged",
      InspectRequested: "inspectRequested",
      SourceChanged: "sourceChanged",
      Paused: "paused",
      SetModeRequested: "setModeRequested"
    };
  }
  initialize(codegenId, sdkLanguage) {
    this._codegenId = codegenId;
    this._sdkLanguage = sdkLanguage;
  }
  dispose() {
    this.setReportStateChanged(false);
  }
  setReportStateChanged(enabled) {
    if (enabled && !this._trackHierarchyListener) {
      this._trackHierarchyListener = {
        onPageOpen: () => this._emitSnapshot(false),
        onPageClose: () => this._emitSnapshot(false)
      };
      this._playwright.instrumentation.addListener(this._trackHierarchyListener, null);
      this._emitSnapshot(true);
    } else if (!enabled && this._trackHierarchyListener) {
      this._playwright.instrumentation.removeListener(this._trackHierarchyListener);
      this._trackHierarchyListener = void 0;
    }
  }
  async resetForReuse() {
    const contexts = /* @__PURE__ */ new Set();
    for (const page of this._playwright.allPages())
      contexts.add(page.context());
    for (const context of contexts)
      await context.resetForReuse(internalMetadata, null);
  }
  async navigate(url) {
    for (const p of this._playwright.allPages())
      await p.mainFrame().goto(internalMetadata, url);
  }
  async setRecorderMode(params) {
    await this._closeBrowsersWithoutPages();
    if (params.mode === "none") {
      for (const recorder of await this._allRecorders()) {
        recorder.hideHighlightedSelector();
        recorder.setMode("none");
      }
      return;
    }
    if (!this._playwright.allBrowsers().length)
      await this._playwright.chromium.launch(internalMetadata, { headless: !!process.env.PW_DEBUG_CONTROLLER_HEADLESS });
    const pages = this._playwright.allPages();
    if (!pages.length) {
      const [browser] = this._playwright.allBrowsers();
      const { context } = await browser.newContextForReuse({}, internalMetadata);
      await context.newPage(internalMetadata);
    }
    if (params.testIdAttributeName) {
      for (const page of this._playwright.allPages())
        page.context().selectors().setTestIdAttributeName(params.testIdAttributeName);
    }
    for (const recorder of await this._allRecorders()) {
      recorder.hideHighlightedSelector();
      if (params.mode !== "inspecting")
        recorder.setOutput(this._codegenId, params.file);
      recorder.setMode(params.mode);
    }
  }
  async highlight(params) {
    if (params.selector)
      (0, import_locatorParser.unsafeLocatorOrSelectorAsSelector)(this._sdkLanguage, params.selector, "data-testid");
    const ariaTemplate = params.ariaTemplate ? (0, import_ariaSnapshot.parseAriaSnapshotUnsafe)(import_utilsBundle.yaml, params.ariaTemplate) : void 0;
    for (const recorder of await this._allRecorders()) {
      if (ariaTemplate)
        recorder.setHighlightedAriaTemplate(ariaTemplate);
      else if (params.selector)
        recorder.setHighlightedSelector(this._sdkLanguage, params.selector);
    }
  }
  async hideHighlight() {
    for (const recorder of await this._allRecorders())
      recorder.hideHighlightedSelector();
    await this._playwright.hideHighlight();
  }
  allBrowsers() {
    return [...this._playwright.allBrowsers()];
  }
  async resume() {
    for (const recorder of await this._allRecorders())
      recorder.resume();
  }
  async kill() {
    (0, import_processLauncher.gracefullyProcessExitDoNotHang)(0);
  }
  async closeAllBrowsers() {
    await Promise.all(this.allBrowsers().map((browser) => browser.close({ reason: "Close all browsers requested" })));
  }
  _emitSnapshot(initial) {
    const pageCount = this._playwright.allPages().length;
    if (initial && !pageCount)
      return;
    this.emit(DebugController.Events.StateChanged, { pageCount });
  }
  async _allRecorders() {
    const contexts = /* @__PURE__ */ new Set();
    for (const page of this._playwright.allPages())
      contexts.add(page.context());
    const result = await Promise.all([...contexts].map((c) => import_recorder.Recorder.showInspector(c, { omitCallTracking: true }, () => Promise.resolve(new InspectingRecorderApp(this)))));
    return result.filter(Boolean);
  }
  async _closeBrowsersWithoutPages() {
    for (const browser of this._playwright.allBrowsers()) {
      for (const context of browser.contexts()) {
        if (!context.pages().length)
          await context.close({ reason: "Browser collected" });
      }
      if (!browser.contexts())
        await browser.close({ reason: "Browser collected" });
    }
  }
}
class InspectingRecorderApp extends import_recorderApp.EmptyRecorderApp {
  constructor(debugController) {
    super();
    this._debugController = debugController;
  }
  async elementPicked(elementInfo) {
    const locator = (0, import_utils.asLocator)(this._debugController._sdkLanguage, elementInfo.selector);
    this._debugController.emit(DebugController.Events.InspectRequested, { selector: elementInfo.selector, locator, ariaSnapshot: elementInfo.ariaSnapshot });
  }
  async setSources(sources) {
    const source = sources.find((s) => s.id === this._debugController._codegenId);
    const { text, header, footer, actions } = source || { text: "" };
    this._debugController.emit(DebugController.Events.SourceChanged, { text, header, footer, actions });
  }
  async setPaused(paused) {
    this._debugController.emit(DebugController.Events.Paused, { paused });
  }
  async setMode(mode) {
    this._debugController.emit(DebugController.Events.SetModeRequested, { mode });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DebugController
});

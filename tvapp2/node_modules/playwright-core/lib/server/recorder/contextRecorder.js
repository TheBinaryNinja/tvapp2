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
var contextRecorder_exports = {};
__export(contextRecorder_exports, {
  ContextRecorder: () => ContextRecorder,
  generateFrameSelector: () => generateFrameSelector
});
module.exports = __toCommonJS(contextRecorder_exports);
var import_events = require("events");
var import_recorderCollection = require("./recorderCollection");
var recorderSource = __toESM(require("../../generated/pollingRecorderSource"));
var import_utils = require("../../utils");
var import_timeoutRunner = require("../../utils/isomorphic/timeoutRunner");
var import_browserContext = require("../browserContext");
var import_languages = require("../codegen/languages");
var import_frames = require("../frames");
var import_page = require("../page");
var import_throttledFile = require("./throttledFile");
var import_language = require("../codegen/language");
class ContextRecorder extends import_events.EventEmitter {
  constructor(context, params, delegate) {
    super();
    this._pageAliases = /* @__PURE__ */ new Map();
    this._lastPopupOrdinal = 0;
    this._lastDialogOrdinal = -1;
    this._lastDownloadOrdinal = -1;
    this._throttledOutputFile = null;
    this._orderedLanguages = [];
    this._listeners = [];
    this._context = context;
    this._params = params;
    this._delegate = delegate;
    this._recorderSources = [];
    const language = params.language || context.attribution.playwright.options.sdkLanguage;
    this.setOutput(language, params.outputFile);
    const languageGeneratorOptions = {
      browserName: context._browser.options.name,
      launchOptions: { headless: false, ...params.launchOptions, tracesDir: void 0 },
      contextOptions: { ...params.contextOptions },
      deviceName: params.device,
      saveStorage: params.saveStorage
    };
    this._collection = new import_recorderCollection.RecorderCollection(this._pageAliases);
    this._collection.on("change", (actions) => {
      this._recorderSources = [];
      for (const languageGenerator of this._orderedLanguages) {
        const { header, footer, actionTexts, text } = (0, import_language.generateCode)(actions, languageGenerator, languageGeneratorOptions);
        const source = {
          isRecorded: true,
          label: languageGenerator.name,
          group: languageGenerator.groupName,
          id: languageGenerator.id,
          text,
          header,
          footer,
          actions: actionTexts,
          language: languageGenerator.highlighter,
          highlight: []
        };
        source.revealLine = text.split("\n").length - 1;
        this._recorderSources.push(source);
        if (languageGenerator === this._orderedLanguages[0])
          this._throttledOutputFile?.setContent(source.text);
      }
      this.emit(ContextRecorder.Events.Change, {
        sources: this._recorderSources,
        actions
      });
    });
    context.on(import_browserContext.BrowserContext.Events.BeforeClose, () => {
      this._throttledOutputFile?.flush();
    });
    this._listeners.push(import_utils.eventsHelper.addEventListener(process, "exit", () => {
      this._throttledOutputFile?.flush();
    }));
    this.setEnabled(params.mode === "recording");
  }
  static {
    this.Events = {
      Change: "change"
    };
  }
  setOutput(codegenId, outputFile) {
    const languages = (0, import_languages.languageSet)();
    const primaryLanguage = [...languages].find((l) => l.id === codegenId);
    if (!primaryLanguage)
      throw new Error(`
===============================
Unsupported language: '${codegenId}'
===============================
`);
    languages.delete(primaryLanguage);
    this._orderedLanguages = [primaryLanguage, ...languages];
    this._throttledOutputFile = outputFile ? new import_throttledFile.ThrottledFile(outputFile) : null;
    this._collection?.restart();
  }
  languageName(id) {
    for (const lang of this._orderedLanguages) {
      if (!id || lang.id === id)
        return lang.highlighter;
    }
    return "javascript";
  }
  async install() {
    this._context.on(import_browserContext.BrowserContext.Events.Page, (page) => this._onPage(page));
    for (const page of this._context.pages())
      this._onPage(page);
    this._context.on(import_browserContext.BrowserContext.Events.Dialog, (dialog) => this._onDialog(dialog.page()));
    await this._context.exposeBinding(
      "__pw_recorderPerformAction",
      false,
      (source, action) => this._performAction(source.frame, action)
    );
    await this._context.exposeBinding(
      "__pw_recorderRecordAction",
      false,
      (source, action) => this._recordAction(source.frame, action)
    );
    await this._context.extendInjectedScript(recorderSource.source);
  }
  setEnabled(enabled) {
    this._collection.setEnabled(enabled);
  }
  dispose() {
    import_utils.eventsHelper.removeEventListeners(this._listeners);
  }
  async _onPage(page) {
    const frame = page.mainFrame();
    page.on("close", () => {
      this._collection.addRecordedAction({
        frame: this._describeMainFrame(page),
        action: {
          name: "closePage",
          signals: []
        },
        startTime: (0, import_utils.monotonicTime)()
      });
      this._pageAliases.delete(page);
    });
    frame.on(import_frames.Frame.Events.InternalNavigation, (event) => {
      if (event.isPublic)
        this._onFrameNavigated(frame, page);
    });
    page.on(import_page.Page.Events.Download, () => this._onDownload(page));
    const suffix = this._pageAliases.size ? String(++this._lastPopupOrdinal) : "";
    const pageAlias = "page" + suffix;
    this._pageAliases.set(page, pageAlias);
    if (page.opener()) {
      this._onPopup(page.opener(), page);
    } else {
      this._collection.addRecordedAction({
        frame: this._describeMainFrame(page),
        action: {
          name: "openPage",
          url: page.mainFrame().url(),
          signals: []
        },
        startTime: (0, import_utils.monotonicTime)()
      });
    }
  }
  clearScript() {
    this._collection.restart();
    if (this._params.mode === "recording") {
      for (const page of this._context.pages())
        this._onFrameNavigated(page.mainFrame(), page);
    }
  }
  runTask(task) {
  }
  _describeMainFrame(page) {
    return {
      pageAlias: this._pageAliases.get(page),
      framePath: []
    };
  }
  async _describeFrame(frame) {
    return {
      pageAlias: this._pageAliases.get(frame._page),
      framePath: await generateFrameSelector(frame)
    };
  }
  testIdAttributeName() {
    return this._params.testIdAttributeName || this._context.selectors().testIdAttributeName() || "data-testid";
  }
  async _createActionInContext(frame, action) {
    const frameDescription = await this._describeFrame(frame);
    const actionInContext = {
      frame: frameDescription,
      action,
      description: void 0,
      startTime: (0, import_utils.monotonicTime)()
    };
    await this._delegate.rewriteActionInContext?.(this._pageAliases, actionInContext);
    return actionInContext;
  }
  async _performAction(frame, action) {
    await this._collection.performAction(await this._createActionInContext(frame, action));
  }
  async _recordAction(frame, action) {
    this._collection.addRecordedAction(await this._createActionInContext(frame, action));
  }
  _onFrameNavigated(frame, page) {
    const pageAlias = this._pageAliases.get(page);
    this._collection.signal(pageAlias, frame, { name: "navigation", url: frame.url() });
  }
  _onPopup(page, popup) {
    const pageAlias = this._pageAliases.get(page);
    const popupAlias = this._pageAliases.get(popup);
    this._collection.signal(pageAlias, page.mainFrame(), { name: "popup", popupAlias });
  }
  _onDownload(page) {
    const pageAlias = this._pageAliases.get(page);
    ++this._lastDownloadOrdinal;
    this._collection.signal(pageAlias, page.mainFrame(), { name: "download", downloadAlias: this._lastDownloadOrdinal ? String(this._lastDownloadOrdinal) : "" });
  }
  _onDialog(page) {
    const pageAlias = this._pageAliases.get(page);
    ++this._lastDialogOrdinal;
    this._collection.signal(pageAlias, page.mainFrame(), { name: "dialog", dialogAlias: this._lastDialogOrdinal ? String(this._lastDialogOrdinal) : "" });
  }
}
async function generateFrameSelector(frame) {
  const selectorPromises = [];
  while (frame) {
    const parent = frame.parentFrame();
    if (!parent)
      break;
    selectorPromises.push(generateFrameSelectorInParent(parent, frame));
    frame = parent;
  }
  const result = await Promise.all(selectorPromises);
  return result.reverse();
}
async function generateFrameSelectorInParent(parent, frame) {
  const result = await (0, import_timeoutRunner.raceAgainstDeadline)(async () => {
    try {
      const frameElement = await frame.frameElement();
      if (!frameElement || !parent)
        return;
      const utility = await parent._utilityContext();
      const injected = await utility.injectedScript();
      const selector = await injected.evaluate((injected2, element) => {
        return injected2.generateSelectorSimple(element);
      }, frameElement);
      return selector;
    } catch (e) {
    }
  }, (0, import_utils.monotonicTime)() + 2e3);
  if (!result.timedOut && result.result)
    return result.result;
  if (frame.name())
    return `iframe[name=${(0, import_utils.quoteCSSAttributeValue)(frame.name())}]`;
  return `iframe[src=${(0, import_utils.quoteCSSAttributeValue)(frame.url())}]`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ContextRecorder,
  generateFrameSelector
});

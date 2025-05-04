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
var frameDispatcher_exports = {};
__export(frameDispatcher_exports, {
  FrameDispatcher: () => FrameDispatcher
});
module.exports = __toCommonJS(frameDispatcher_exports);
var import_frames = require("../frames");
var import_dispatcher = require("./dispatcher");
var import_elementHandlerDispatcher = require("./elementHandlerDispatcher");
var import_jsHandleDispatcher = require("./jsHandleDispatcher");
var import_networkDispatchers = require("./networkDispatchers");
var import_networkDispatchers2 = require("./networkDispatchers");
var import_ariaSnapshot = require("../../utils/isomorphic/ariaSnapshot");
var import_utilsBundle = require("../../utilsBundle");
class FrameDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, frame) {
    const gcBucket = frame._page.mainFrame() === frame ? "MainFrame" : "Frame";
    const pageDispatcher = (0, import_dispatcher.existingDispatcher)(frame._page);
    super(pageDispatcher || scope, frame, "Frame", {
      url: frame.url(),
      name: frame.name(),
      parentFrame: FrameDispatcher.fromNullable(scope, frame.parentFrame()),
      loadStates: Array.from(frame._firedLifecycleEvents)
    }, gcBucket);
    this._type_Frame = true;
    this._browserContextDispatcher = scope;
    this._frame = frame;
    this.addObjectListener(import_frames.Frame.Events.AddLifecycle, (lifecycleEvent) => {
      this._dispatchEvent("loadstate", { add: lifecycleEvent });
    });
    this.addObjectListener(import_frames.Frame.Events.RemoveLifecycle, (lifecycleEvent) => {
      this._dispatchEvent("loadstate", { remove: lifecycleEvent });
    });
    this.addObjectListener(import_frames.Frame.Events.InternalNavigation, (event) => {
      if (!event.isPublic)
        return;
      const params = { url: event.url, name: event.name, error: event.error ? event.error.message : void 0 };
      if (event.newDocument)
        params.newDocument = { request: import_networkDispatchers2.RequestDispatcher.fromNullable(this._browserContextDispatcher, event.newDocument.request || null) };
      this._dispatchEvent("navigated", params);
    });
  }
  static from(scope, frame) {
    const result = (0, import_dispatcher.existingDispatcher)(frame);
    return result || new FrameDispatcher(scope, frame);
  }
  static fromNullable(scope, frame) {
    if (!frame)
      return;
    return FrameDispatcher.from(scope, frame);
  }
  async goto(params, metadata) {
    return { response: import_networkDispatchers.ResponseDispatcher.fromNullable(this._browserContextDispatcher, await this._frame.goto(metadata, params.url, params)) };
  }
  async frameElement() {
    return { element: import_elementHandlerDispatcher.ElementHandleDispatcher.from(this, await this._frame.frameElement()) };
  }
  async evaluateExpression(params, metadata) {
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await this._frame.evaluateExpression(params.expression, { isFunction: params.isFunction }, (0, import_jsHandleDispatcher.parseArgument)(params.arg))) };
  }
  async evaluateExpressionHandle(params, metadata) {
    return { handle: import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(this, await this._frame.evaluateExpressionHandle(params.expression, { isFunction: params.isFunction }, (0, import_jsHandleDispatcher.parseArgument)(params.arg))) };
  }
  async waitForSelector(params, metadata) {
    return { element: import_elementHandlerDispatcher.ElementHandleDispatcher.fromNullable(this, await this._frame.waitForSelector(metadata, params.selector, params)) };
  }
  async dispatchEvent(params, metadata) {
    return this._frame.dispatchEvent(metadata, params.selector, params.type, (0, import_jsHandleDispatcher.parseArgument)(params.eventInit), params);
  }
  async evalOnSelector(params, metadata) {
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await this._frame.evalOnSelector(params.selector, !!params.strict, params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg))) };
  }
  async evalOnSelectorAll(params, metadata) {
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await this._frame.evalOnSelectorAll(params.selector, params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg))) };
  }
  async querySelector(params, metadata) {
    return { element: import_elementHandlerDispatcher.ElementHandleDispatcher.fromNullable(this, await this._frame.querySelector(params.selector, params)) };
  }
  async querySelectorAll(params, metadata) {
    const elements = await this._frame.querySelectorAll(params.selector);
    return { elements: elements.map((e) => import_elementHandlerDispatcher.ElementHandleDispatcher.from(this, e)) };
  }
  async queryCount(params) {
    return { value: await this._frame.queryCount(params.selector) };
  }
  async content() {
    return { value: await this._frame.content() };
  }
  async setContent(params, metadata) {
    return await this._frame.setContent(metadata, params.html, params);
  }
  async addScriptTag(params, metadata) {
    return { element: import_elementHandlerDispatcher.ElementHandleDispatcher.from(this, await this._frame.addScriptTag(params)) };
  }
  async addStyleTag(params, metadata) {
    return { element: import_elementHandlerDispatcher.ElementHandleDispatcher.from(this, await this._frame.addStyleTag(params)) };
  }
  async click(params, metadata) {
    metadata.potentiallyClosesScope = true;
    return await this._frame.click(metadata, params.selector, params);
  }
  async dblclick(params, metadata) {
    return await this._frame.dblclick(metadata, params.selector, params);
  }
  async dragAndDrop(params, metadata) {
    return await this._frame.dragAndDrop(metadata, params.source, params.target, params);
  }
  async tap(params, metadata) {
    return await this._frame.tap(metadata, params.selector, params);
  }
  async fill(params, metadata) {
    return await this._frame.fill(metadata, params.selector, params.value, params);
  }
  async focus(params, metadata) {
    await this._frame.focus(metadata, params.selector, params);
  }
  async blur(params, metadata) {
    await this._frame.blur(metadata, params.selector, params);
  }
  async textContent(params, metadata) {
    const value = await this._frame.textContent(metadata, params.selector, params);
    return { value: value === null ? void 0 : value };
  }
  async innerText(params, metadata) {
    return { value: await this._frame.innerText(metadata, params.selector, params) };
  }
  async innerHTML(params, metadata) {
    return { value: await this._frame.innerHTML(metadata, params.selector, params) };
  }
  async getAttribute(params, metadata) {
    const value = await this._frame.getAttribute(metadata, params.selector, params.name, params);
    return { value: value === null ? void 0 : value };
  }
  async inputValue(params, metadata) {
    const value = await this._frame.inputValue(metadata, params.selector, params);
    return { value };
  }
  async isChecked(params, metadata) {
    return { value: await this._frame.isChecked(metadata, params.selector, params) };
  }
  async isDisabled(params, metadata) {
    return { value: await this._frame.isDisabled(metadata, params.selector, params) };
  }
  async isEditable(params, metadata) {
    return { value: await this._frame.isEditable(metadata, params.selector, params) };
  }
  async isEnabled(params, metadata) {
    return { value: await this._frame.isEnabled(metadata, params.selector, params) };
  }
  async isHidden(params, metadata) {
    return { value: await this._frame.isHidden(metadata, params.selector, params) };
  }
  async isVisible(params, metadata) {
    return { value: await this._frame.isVisible(metadata, params.selector, params) };
  }
  async hover(params, metadata) {
    return await this._frame.hover(metadata, params.selector, params);
  }
  async selectOption(params, metadata) {
    const elements = (params.elements || []).map((e) => e._elementHandle);
    return { values: await this._frame.selectOption(metadata, params.selector, elements, params.options || [], params) };
  }
  async setInputFiles(params, metadata) {
    return await this._frame.setInputFiles(metadata, params.selector, params);
  }
  async type(params, metadata) {
    return await this._frame.type(metadata, params.selector, params.text, params);
  }
  async press(params, metadata) {
    return await this._frame.press(metadata, params.selector, params.key, params);
  }
  async check(params, metadata) {
    return await this._frame.check(metadata, params.selector, params);
  }
  async uncheck(params, metadata) {
    return await this._frame.uncheck(metadata, params.selector, params);
  }
  async waitForTimeout(params, metadata) {
    return await this._frame.waitForTimeout(metadata, params.timeout);
  }
  async waitForFunction(params, metadata) {
    return { handle: import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(this, await this._frame._waitForFunctionExpression(metadata, params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg), params)) };
  }
  async title(params, metadata) {
    return { value: await this._frame.title() };
  }
  async highlight(params, metadata) {
    return await this._frame.highlight(params.selector);
  }
  async expect(params, metadata) {
    metadata.potentiallyClosesScope = true;
    let expectedValue = params.expectedValue ? (0, import_jsHandleDispatcher.parseArgument)(params.expectedValue) : void 0;
    if (params.expression === "to.match.aria" && expectedValue)
      expectedValue = (0, import_ariaSnapshot.parseAriaSnapshotUnsafe)(import_utilsBundle.yaml, expectedValue);
    const result = await this._frame.expect(metadata, params.selector, { ...params, expectedValue });
    if (result.received !== void 0)
      result.received = (0, import_jsHandleDispatcher.serializeResult)(result.received);
    return result;
  }
  async ariaSnapshot(params, metadata) {
    return { snapshot: await this._frame.ariaSnapshot(metadata, params.selector, params) };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FrameDispatcher
});

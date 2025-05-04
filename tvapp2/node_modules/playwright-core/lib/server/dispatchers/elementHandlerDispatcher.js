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
var elementHandlerDispatcher_exports = {};
__export(elementHandlerDispatcher_exports, {
  ElementHandleDispatcher: () => ElementHandleDispatcher
});
module.exports = __toCommonJS(elementHandlerDispatcher_exports);
var import_browserContextDispatcher = require("./browserContextDispatcher");
var import_dispatcher = require("./dispatcher");
var import_frameDispatcher = require("./frameDispatcher");
var import_jsHandleDispatcher = require("./jsHandleDispatcher");
var import_pageDispatcher = require("./pageDispatcher");
class ElementHandleDispatcher extends import_jsHandleDispatcher.JSHandleDispatcher {
  constructor(scope, elementHandle) {
    super(scope, elementHandle);
    this._type_ElementHandle = true;
    this._elementHandle = elementHandle;
  }
  static from(scope, handle) {
    return (0, import_dispatcher.existingDispatcher)(handle) || new ElementHandleDispatcher(scope, handle);
  }
  static fromNullable(scope, handle) {
    if (!handle)
      return void 0;
    return (0, import_dispatcher.existingDispatcher)(handle) || new ElementHandleDispatcher(scope, handle);
  }
  static fromJSHandle(scope, handle) {
    const result = (0, import_dispatcher.existingDispatcher)(handle);
    if (result)
      return result;
    return handle.asElement() ? new ElementHandleDispatcher(scope, handle.asElement()) : new import_jsHandleDispatcher.JSHandleDispatcher(scope, handle);
  }
  async ownerFrame(params, metadata) {
    const frame = await this._elementHandle.ownerFrame();
    return { frame: frame ? import_frameDispatcher.FrameDispatcher.from(this._browserContextDispatcher(), frame) : void 0 };
  }
  async contentFrame(params, metadata) {
    const frame = await this._elementHandle.contentFrame();
    return { frame: frame ? import_frameDispatcher.FrameDispatcher.from(this._browserContextDispatcher(), frame) : void 0 };
  }
  async generateLocatorString(params, metadata) {
    return { value: await this._elementHandle.generateLocatorString() };
  }
  async getAttribute(params, metadata) {
    const value = await this._elementHandle.getAttribute(metadata, params.name);
    return { value: value === null ? void 0 : value };
  }
  async inputValue(params, metadata) {
    const value = await this._elementHandle.inputValue(metadata);
    return { value };
  }
  async textContent(params, metadata) {
    const value = await this._elementHandle.textContent(metadata);
    return { value: value === null ? void 0 : value };
  }
  async innerText(params, metadata) {
    return { value: await this._elementHandle.innerText(metadata) };
  }
  async innerHTML(params, metadata) {
    return { value: await this._elementHandle.innerHTML(metadata) };
  }
  async isChecked(params, metadata) {
    return { value: await this._elementHandle.isChecked(metadata) };
  }
  async isDisabled(params, metadata) {
    return { value: await this._elementHandle.isDisabled(metadata) };
  }
  async isEditable(params, metadata) {
    return { value: await this._elementHandle.isEditable(metadata) };
  }
  async isEnabled(params, metadata) {
    return { value: await this._elementHandle.isEnabled(metadata) };
  }
  async isHidden(params, metadata) {
    return { value: await this._elementHandle.isHidden(metadata) };
  }
  async isVisible(params, metadata) {
    return { value: await this._elementHandle.isVisible(metadata) };
  }
  async dispatchEvent(params, metadata) {
    await this._elementHandle.dispatchEvent(metadata, params.type, (0, import_jsHandleDispatcher.parseArgument)(params.eventInit));
  }
  async scrollIntoViewIfNeeded(params, metadata) {
    await this._elementHandle.scrollIntoViewIfNeeded(metadata, params);
  }
  async hover(params, metadata) {
    return await this._elementHandle.hover(metadata, params);
  }
  async click(params, metadata) {
    return await this._elementHandle.click(metadata, params);
  }
  async dblclick(params, metadata) {
    return await this._elementHandle.dblclick(metadata, params);
  }
  async tap(params, metadata) {
    return await this._elementHandle.tap(metadata, params);
  }
  async selectOption(params, metadata) {
    const elements = (params.elements || []).map((e) => e._elementHandle);
    return { values: await this._elementHandle.selectOption(metadata, elements, params.options || [], params) };
  }
  async fill(params, metadata) {
    return await this._elementHandle.fill(metadata, params.value, params);
  }
  async selectText(params, metadata) {
    await this._elementHandle.selectText(metadata, params);
  }
  async setInputFiles(params, metadata) {
    return await this._elementHandle.setInputFiles(metadata, params);
  }
  async focus(params, metadata) {
    await this._elementHandle.focus(metadata);
  }
  async type(params, metadata) {
    return await this._elementHandle.type(metadata, params.text, params);
  }
  async press(params, metadata) {
    return await this._elementHandle.press(metadata, params.key, params);
  }
  async check(params, metadata) {
    return await this._elementHandle.check(metadata, params);
  }
  async uncheck(params, metadata) {
    return await this._elementHandle.uncheck(metadata, params);
  }
  async boundingBox(params, metadata) {
    const value = await this._elementHandle.boundingBox();
    return { value: value || void 0 };
  }
  async screenshot(params, metadata) {
    const mask = (params.mask || []).map(({ frame, selector }) => ({
      frame: frame._object,
      selector
    }));
    return { binary: await this._elementHandle.screenshot(metadata, { ...params, mask }) };
  }
  async querySelector(params, metadata) {
    const handle = await this._elementHandle.querySelector(params.selector, params);
    return { element: ElementHandleDispatcher.fromNullable(this.parentScope(), handle) };
  }
  async querySelectorAll(params, metadata) {
    const elements = await this._elementHandle.querySelectorAll(params.selector);
    return { elements: elements.map((e) => ElementHandleDispatcher.from(this.parentScope(), e)) };
  }
  async evalOnSelector(params, metadata) {
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await this._elementHandle.evalOnSelector(params.selector, !!params.strict, params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg))) };
  }
  async evalOnSelectorAll(params, metadata) {
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await this._elementHandle.evalOnSelectorAll(params.selector, params.expression, params.isFunction, (0, import_jsHandleDispatcher.parseArgument)(params.arg))) };
  }
  async waitForElementState(params, metadata) {
    await this._elementHandle.waitForElementState(metadata, params.state, params);
  }
  async waitForSelector(params, metadata) {
    return { element: ElementHandleDispatcher.fromNullable(this.parentScope(), await this._elementHandle.waitForSelector(metadata, params.selector, params)) };
  }
  _browserContextDispatcher() {
    const scope = this.parentScope();
    if (scope instanceof import_browserContextDispatcher.BrowserContextDispatcher)
      return scope;
    if (scope instanceof import_pageDispatcher.PageDispatcher)
      return scope.parentScope();
    if (scope instanceof import_pageDispatcher.WorkerDispatcher || scope instanceof import_frameDispatcher.FrameDispatcher) {
      const parentScope = scope.parentScope();
      if (parentScope instanceof import_browserContextDispatcher.BrowserContextDispatcher)
        return parentScope;
      return parentScope.parentScope();
    }
    throw new Error("ElementHandle belongs to unexpected scope");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ElementHandleDispatcher
});

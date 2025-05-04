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
var electronDispatcher_exports = {};
__export(electronDispatcher_exports, {
  ElectronApplicationDispatcher: () => ElectronApplicationDispatcher,
  ElectronDispatcher: () => ElectronDispatcher
});
module.exports = __toCommonJS(electronDispatcher_exports);
var import_browserContextDispatcher = require("./browserContextDispatcher");
var import_dispatcher = require("./dispatcher");
var import_elementHandlerDispatcher = require("./elementHandlerDispatcher");
var import_jsHandleDispatcher = require("./jsHandleDispatcher");
var import_electron = require("../electron/electron");
class ElectronDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, electron) {
    super(scope, electron, "Electron", {});
    this._type_Electron = true;
  }
  async launch(params) {
    const electronApplication = await this._object.launch(params);
    return { electronApplication: new ElectronApplicationDispatcher(this, electronApplication) };
  }
}
class ElectronApplicationDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, electronApplication) {
    super(scope, electronApplication, "ElectronApplication", {
      context: new import_browserContextDispatcher.BrowserContextDispatcher(scope, electronApplication.context())
    });
    this._type_EventTarget = true;
    this._type_ElectronApplication = true;
    this._subscriptions = /* @__PURE__ */ new Set();
    this.addObjectListener(import_electron.ElectronApplication.Events.Close, () => {
      this._dispatchEvent("close");
      this._dispose();
    });
    this.addObjectListener(import_electron.ElectronApplication.Events.Console, (message) => {
      if (!this._subscriptions.has("console"))
        return;
      this._dispatchEvent("console", {
        type: message.type(),
        text: message.text(),
        args: message.args().map((a) => import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(this, a)),
        location: message.location()
      });
    });
  }
  async browserWindow(params) {
    const handle = await this._object.browserWindow(params.page.page());
    return { handle: import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(this, handle) };
  }
  async evaluateExpression(params) {
    const handle = await this._object._nodeElectronHandlePromise;
    return { value: (0, import_jsHandleDispatcher.serializeResult)(await handle.evaluateExpression(params.expression, { isFunction: params.isFunction }, (0, import_jsHandleDispatcher.parseArgument)(params.arg))) };
  }
  async evaluateExpressionHandle(params) {
    const handle = await this._object._nodeElectronHandlePromise;
    const result = await handle.evaluateExpressionHandle(params.expression, { isFunction: params.isFunction }, (0, import_jsHandleDispatcher.parseArgument)(params.arg));
    return { handle: import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSHandle(this, result) };
  }
  async updateSubscription(params) {
    if (params.enabled)
      this._subscriptions.add(params.event);
    else
      this._subscriptions.delete(params.event);
  }
  async close() {
    await this._object.close();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ElectronApplicationDispatcher,
  ElectronDispatcher
});

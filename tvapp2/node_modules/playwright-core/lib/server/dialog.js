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
var dialog_exports = {};
__export(dialog_exports, {
  Dialog: () => Dialog
});
module.exports = __toCommonJS(dialog_exports);
var import_utils = require("../utils");
var import_instrumentation = require("./instrumentation");
class Dialog extends import_instrumentation.SdkObject {
  constructor(page, type, message, onHandle, defaultValue) {
    super(page, "dialog");
    this._handled = false;
    this._page = page;
    this._type = type;
    this._message = message;
    this._onHandle = onHandle;
    this._defaultValue = defaultValue || "";
    this._page._frameManager.dialogDidOpen(this);
    this.instrumentation.onDialog(this);
  }
  page() {
    return this._page;
  }
  type() {
    return this._type;
  }
  message() {
    return this._message;
  }
  defaultValue() {
    return this._defaultValue;
  }
  async accept(promptText) {
    (0, import_utils.assert)(!this._handled, "Cannot accept dialog which is already handled!");
    this._handled = true;
    this._page._frameManager.dialogWillClose(this);
    await this._onHandle(true, promptText);
  }
  async dismiss() {
    (0, import_utils.assert)(!this._handled, "Cannot dismiss dialog which is already handled!");
    this._handled = true;
    this._page._frameManager.dialogWillClose(this);
    await this._onHandle(false);
  }
  async close() {
    if (this._type === "beforeunload")
      await this.accept();
    else
      await this.dismiss();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Dialog
});

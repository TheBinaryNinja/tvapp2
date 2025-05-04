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
var selectorsDispatcher_exports = {};
__export(selectorsDispatcher_exports, {
  SelectorsDispatcher: () => SelectorsDispatcher
});
module.exports = __toCommonJS(selectorsDispatcher_exports);
var import_dispatcher = require("./dispatcher");
class SelectorsDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, selectors) {
    super(scope, selectors, "Selectors", {});
    this._type_Selectors = true;
  }
  async register(params) {
    await this._object.register(params.name, params.source, params.contentScript);
  }
  async setTestIdAttributeName(params) {
    this._object.setTestIdAttributeName(params.testIdAttributeName);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SelectorsDispatcher
});

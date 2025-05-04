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
var tracingDispatcher_exports = {};
__export(tracingDispatcher_exports, {
  TracingDispatcher: () => TracingDispatcher
});
module.exports = __toCommonJS(tracingDispatcher_exports);
var import_artifactDispatcher = require("./artifactDispatcher");
var import_dispatcher = require("./dispatcher");
class TracingDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, tracing) {
    super(scope, tracing, "Tracing", {});
    this._type_Tracing = true;
  }
  static from(scope, tracing) {
    const result = (0, import_dispatcher.existingDispatcher)(tracing);
    return result || new TracingDispatcher(scope, tracing);
  }
  async tracingStart(params) {
    await this._object.start(params);
  }
  async tracingStartChunk(params) {
    return await this._object.startChunk(params);
  }
  async tracingGroup(params, metadata) {
    const { name, location } = params;
    await this._object.group(name, location, metadata);
  }
  async tracingGroupEnd(params) {
    await this._object.groupEnd();
  }
  async tracingStopChunk(params) {
    const { artifact, entries } = await this._object.stopChunk(params);
    return { artifact: artifact ? import_artifactDispatcher.ArtifactDispatcher.from(this, artifact) : void 0, entries };
  }
  async tracingStop(params) {
    await this._object.stop();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TracingDispatcher
});

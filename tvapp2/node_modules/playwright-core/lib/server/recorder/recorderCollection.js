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
var recorderCollection_exports = {};
__export(recorderCollection_exports, {
  RecorderCollection: () => RecorderCollection
});
module.exports = __toCommonJS(recorderCollection_exports);
var import_events = require("events");
var import_recorderRunner = require("./recorderRunner");
var import_recorderUtils = require("./recorderUtils");
var import_debug = require("../utils/debug");
var import_time = require("../../utils/isomorphic/time");
class RecorderCollection extends import_events.EventEmitter {
  constructor(pageAliases) {
    super();
    this._actions = [];
    this._enabled = false;
    this._pageAliases = pageAliases;
  }
  restart() {
    this._actions = [];
    this.emit("change", []);
  }
  setEnabled(enabled) {
    this._enabled = enabled;
  }
  async performAction(actionInContext) {
    await this._addAction(actionInContext, async () => {
      await (0, import_recorderRunner.performAction)(this._pageAliases, actionInContext);
    });
  }
  addRecordedAction(actionInContext) {
    if (["openPage", "closePage"].includes(actionInContext.action.name)) {
      this._actions.push(actionInContext);
      this._fireChange();
      return;
    }
    this._addAction(actionInContext).catch(() => {
    });
  }
  async _addAction(actionInContext, callback) {
    if (!this._enabled)
      return;
    if (actionInContext.action.name === "openPage" || actionInContext.action.name === "closePage") {
      this._actions.push(actionInContext);
      this._fireChange();
      return;
    }
    this._actions.push(actionInContext);
    this._fireChange();
    await callback?.().catch();
    actionInContext.endTime = (0, import_time.monotonicTime)();
  }
  signal(pageAlias, frame, signal) {
    if (!this._enabled)
      return;
    if (signal.name === "navigation" && frame._page.mainFrame() === frame) {
      const timestamp = (0, import_time.monotonicTime)();
      const lastAction = this._actions[this._actions.length - 1];
      const signalThreshold = (0, import_debug.isUnderTest)() ? 500 : 5e3;
      let generateGoto = false;
      if (!lastAction)
        generateGoto = true;
      else if (lastAction.action.name !== "click" && lastAction.action.name !== "press" && lastAction.action.name !== "fill")
        generateGoto = true;
      else if (timestamp - lastAction.startTime > signalThreshold)
        generateGoto = true;
      if (generateGoto) {
        this.addRecordedAction({
          frame: {
            pageAlias,
            framePath: []
          },
          action: {
            name: "navigate",
            url: frame.url(),
            signals: []
          },
          startTime: timestamp,
          endTime: timestamp
        });
      }
      return;
    }
    if (this._actions.length) {
      this._actions[this._actions.length - 1].action.signals.push(signal);
      this._fireChange();
      return;
    }
  }
  _fireChange() {
    if (!this._enabled)
      return;
    this.emit("change", (0, import_recorderUtils.collapseActions)(this._actions));
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RecorderCollection
});

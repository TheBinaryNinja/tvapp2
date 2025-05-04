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
var selectors_exports = {};
__export(selectors_exports, {
  Selectors: () => Selectors,
  SelectorsOwner: () => SelectorsOwner,
  setPlatformForSelectors: () => setPlatformForSelectors
});
module.exports = __toCommonJS(selectors_exports);
var import_channelOwner = require("./channelOwner");
var import_clientHelper = require("./clientHelper");
var import_locator = require("./locator");
var import_platform = require("./platform");
let platform = import_platform.emptyPlatform;
function setPlatformForSelectors(p) {
  platform = p;
}
class Selectors {
  constructor() {
    this._channels = /* @__PURE__ */ new Set();
    this._registrations = [];
  }
  async register(name, script, options = {}) {
    const source = await (0, import_clientHelper.evaluationScript)(platform, script, void 0, false);
    const params = { ...options, name, source };
    for (const channel of this._channels)
      await channel._channel.register(params);
    this._registrations.push(params);
  }
  setTestIdAttribute(attributeName) {
    (0, import_locator.setTestIdAttribute)(attributeName);
    for (const channel of this._channels)
      channel._channel.setTestIdAttributeName({ testIdAttributeName: attributeName }).catch(() => {
      });
  }
  _addChannel(channel) {
    this._channels.add(channel);
    for (const params of this._registrations) {
      channel._channel.register(params).catch(() => {
      });
      channel._channel.setTestIdAttributeName({ testIdAttributeName: (0, import_locator.testIdAttributeName)() }).catch(() => {
      });
    }
  }
  _removeChannel(channel) {
    this._channels.delete(channel);
  }
}
class SelectorsOwner extends import_channelOwner.ChannelOwner {
  static from(browser) {
    return browser._object;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Selectors,
  SelectorsOwner,
  setPlatformForSelectors
});

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
var clock_exports = {};
__export(clock_exports, {
  Clock: () => Clock
});
module.exports = __toCommonJS(clock_exports);
var clockSource = __toESM(require("../generated/clockSource"));
class Clock {
  constructor(browserContext) {
    this._scriptInstalled = false;
    this._browserContext = browserContext;
  }
  markAsUninstalled() {
    this._scriptInstalled = false;
  }
  async fastForward(ticks) {
    await this._installIfNeeded();
    const ticksMillis = parseTicks(ticks);
    await this._browserContext.addInitScript(`globalThis.__pwClock.controller.log('fastForward', ${Date.now()}, ${ticksMillis})`);
    await this._evaluateInFrames(`globalThis.__pwClock.controller.fastForward(${ticksMillis})`);
  }
  async install(time) {
    await this._installIfNeeded();
    const timeMillis = time !== void 0 ? parseTime(time) : Date.now();
    await this._browserContext.addInitScript(`globalThis.__pwClock.controller.log('install', ${Date.now()}, ${timeMillis})`);
    await this._evaluateInFrames(`globalThis.__pwClock.controller.install(${timeMillis})`);
  }
  async pauseAt(ticks) {
    await this._installIfNeeded();
    const timeMillis = parseTime(ticks);
    await this._browserContext.addInitScript(`globalThis.__pwClock.controller.log('pauseAt', ${Date.now()}, ${timeMillis})`);
    await this._evaluateInFrames(`globalThis.__pwClock.controller.pauseAt(${timeMillis})`);
  }
  async resume() {
    await this._installIfNeeded();
    await this._browserContext.addInitScript(`globalThis.__pwClock.controller.log('resume', ${Date.now()})`);
    await this._evaluateInFrames(`globalThis.__pwClock.controller.resume()`);
  }
  async setFixedTime(time) {
    await this._installIfNeeded();
    const timeMillis = parseTime(time);
    await this._browserContext.addInitScript(`globalThis.__pwClock.controller.log('setFixedTime', ${Date.now()}, ${timeMillis})`);
    await this._evaluateInFrames(`globalThis.__pwClock.controller.setFixedTime(${timeMillis})`);
  }
  async setSystemTime(time) {
    await this._installIfNeeded();
    const timeMillis = parseTime(time);
    await this._browserContext.addInitScript(`globalThis.__pwClock.controller.log('setSystemTime', ${Date.now()}, ${timeMillis})`);
    await this._evaluateInFrames(`globalThis.__pwClock.controller.setSystemTime(${timeMillis})`);
  }
  async runFor(ticks) {
    await this._installIfNeeded();
    const ticksMillis = parseTicks(ticks);
    await this._browserContext.addInitScript(`globalThis.__pwClock.controller.log('runFor', ${Date.now()}, ${ticksMillis})`);
    await this._evaluateInFrames(`globalThis.__pwClock.controller.runFor(${ticksMillis})`);
  }
  async _installIfNeeded() {
    if (this._scriptInstalled)
      return;
    this._scriptInstalled = true;
    const script = `(() => {
      const module = {};
      ${clockSource.source}
      globalThis.__pwClock = (module.exports.inject())(globalThis);
    })();`;
    await this._browserContext.addInitScript(script);
    await this._evaluateInFrames(script);
  }
  async _evaluateInFrames(script) {
    await this._browserContext.safeNonStallingEvaluateInAllFrames(script, "main", { throwOnJSErrors: true });
  }
}
function parseTicks(value) {
  if (typeof value === "number")
    return value;
  if (!value)
    return 0;
  const str = value;
  const strings = str.split(":");
  const l = strings.length;
  let i = l;
  let ms = 0;
  let parsed;
  if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
    throw new Error(
      `Clock only understands numbers, 'mm:ss' and 'hh:mm:ss'`
    );
  }
  while (i--) {
    parsed = parseInt(strings[i], 10);
    if (parsed >= 60)
      throw new Error(`Invalid time ${str}`);
    ms += parsed * Math.pow(60, l - i - 1);
  }
  return ms * 1e3;
}
function parseTime(epoch) {
  if (!epoch)
    return 0;
  if (typeof epoch === "number")
    return epoch;
  const parsed = new Date(epoch);
  if (!isFinite(parsed.getTime()))
    throw new Error(`Invalid date: ${epoch}`);
  return parsed.getTime();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Clock
});

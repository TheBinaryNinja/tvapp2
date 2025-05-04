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
var progress_exports = {};
__export(progress_exports, {
  ProgressController: () => ProgressController
});
module.exports = __toCommonJS(progress_exports);
var import_errors = require("./errors");
var import_utils = require("../utils");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
class ProgressController {
  constructor(metadata, sdkObject) {
    this._forceAbortPromise = new import_manualPromise.ManualPromise();
    // Cleanups to be run only in the case of abort.
    this._cleanups = [];
    this._logName = "api";
    this._state = "before";
    this._deadline = 0;
    this._timeout = 0;
    this.metadata = metadata;
    this.sdkObject = sdkObject;
    this.instrumentation = sdkObject.instrumentation;
    this._forceAbortPromise.catch((e) => null);
  }
  setLogName(logName) {
    this._logName = logName;
  }
  abort(error) {
    this._forceAbortPromise.reject(error);
  }
  async run(task, timeout) {
    if (timeout) {
      this._timeout = timeout;
      this._deadline = timeout ? (0, import_utils.monotonicTime)() + timeout : 0;
    }
    (0, import_utils.assert)(this._state === "before");
    this._state = "running";
    this.sdkObject.attribution.context?._activeProgressControllers.add(this);
    const progress = {
      log: (message) => {
        if (this._state === "running")
          this.metadata.log.push(message);
        this.instrumentation.onCallLog(this.sdkObject, this.metadata, this._logName, message);
      },
      timeUntilDeadline: () => this._deadline ? this._deadline - (0, import_utils.monotonicTime)() : 2147483647,
      // 2^31-1 safe setTimeout in Node.
      isRunning: () => this._state === "running",
      cleanupWhenAborted: (cleanup) => {
        if (this._state === "running")
          this._cleanups.push(cleanup);
        else
          runCleanup(cleanup);
      },
      throwIfAborted: () => {
        if (this._state === "aborted")
          throw new AbortedError();
      },
      metadata: this.metadata
    };
    const timeoutError = new import_errors.TimeoutError(`Timeout ${this._timeout}ms exceeded.`);
    const timer = setTimeout(() => this._forceAbortPromise.reject(timeoutError), progress.timeUntilDeadline());
    try {
      const promise = task(progress);
      const result = await Promise.race([promise, this._forceAbortPromise]);
      this._state = "finished";
      return result;
    } catch (e) {
      this._state = "aborted";
      await Promise.all(this._cleanups.splice(0).map(runCleanup));
      throw e;
    } finally {
      this.sdkObject.attribution.context?._activeProgressControllers.delete(this);
      clearTimeout(timer);
    }
  }
}
async function runCleanup(cleanup) {
  try {
    await cleanup();
  } catch (e) {
  }
}
class AbortedError extends Error {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ProgressController
});

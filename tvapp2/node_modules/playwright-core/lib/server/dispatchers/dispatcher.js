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
var dispatcher_exports = {};
__export(dispatcher_exports, {
  Dispatcher: () => Dispatcher,
  DispatcherConnection: () => DispatcherConnection,
  RootDispatcher: () => RootDispatcher,
  dispatcherSymbol: () => dispatcherSymbol,
  existingDispatcher: () => existingDispatcher,
  setMaxDispatchersForTest: () => setMaxDispatchersForTest
});
module.exports = __toCommonJS(dispatcher_exports);
var import_events = require("events");
var import_eventsHelper = require("../utils/eventsHelper");
var import_validator = require("../../protocol/validator");
var import_utils = require("../../utils");
var import_debug = require("../utils/debug");
var import_errors = require("../errors");
var import_instrumentation = require("../instrumentation");
var import_protocolError = require("../protocolError");
var import_callLog = require("../callLog");
const dispatcherSymbol = Symbol("dispatcher");
const metadataValidator = (0, import_validator.createMetadataValidator)();
function existingDispatcher(object) {
  return object[dispatcherSymbol];
}
let maxDispatchersOverride;
function setMaxDispatchersForTest(value) {
  maxDispatchersOverride = value;
}
function maxDispatchersForBucket(gcBucket) {
  return maxDispatchersOverride ?? {
    "JSHandle": 1e5,
    "ElementHandle": 1e5
  }[gcBucket] ?? 1e4;
}
class Dispatcher extends import_events.EventEmitter {
  constructor(parent, object, type, initializer, gcBucket) {
    super();
    // Only "isScope" channel owners have registered dispatchers inside.
    this._dispatchers = /* @__PURE__ */ new Map();
    this._disposed = false;
    this._eventListeners = [];
    this._openScope = new import_utils.LongStandingScope();
    this._connection = parent instanceof DispatcherConnection ? parent : parent._connection;
    this._parent = parent instanceof DispatcherConnection ? void 0 : parent;
    const guid = object.guid;
    this._guid = guid;
    this._type = type;
    this._object = object;
    this._gcBucket = gcBucket ?? type;
    object[dispatcherSymbol] = this;
    this._connection.registerDispatcher(this);
    if (this._parent) {
      (0, import_utils.assert)(!this._parent._dispatchers.has(guid));
      this._parent._dispatchers.set(guid, this);
    }
    if (this._parent)
      this._connection.sendCreate(this._parent, type, guid, initializer);
    this._connection.maybeDisposeStaleDispatchers(this._gcBucket);
  }
  parentScope() {
    return this._parent;
  }
  addObjectListener(eventName, handler) {
    this._eventListeners.push(import_eventsHelper.eventsHelper.addEventListener(this._object, eventName, handler));
  }
  adopt(child) {
    if (child._parent === this)
      return;
    const oldParent = child._parent;
    oldParent._dispatchers.delete(child._guid);
    this._dispatchers.set(child._guid, child);
    child._parent = this;
    this._connection.sendAdopt(this, child);
  }
  async _handleCommand(callMetadata, method, validParams) {
    const commandPromise = this[method](validParams, callMetadata);
    try {
      return await this._openScope.race(commandPromise);
    } catch (e) {
      if (callMetadata.potentiallyClosesScope && (0, import_errors.isTargetClosedError)(e))
        return await commandPromise;
      throw e;
    }
  }
  _dispatchEvent(method, params) {
    if (this._disposed) {
      if ((0, import_debug.isUnderTest)())
        throw new Error(`${this._guid} is sending "${String(method)}" event after being disposed`);
      return;
    }
    this._connection.sendEvent(this, method, params);
  }
  _dispose(reason) {
    this._disposeRecursively(new import_errors.TargetClosedError());
    this._connection.sendDispose(this, reason);
  }
  _onDispose() {
  }
  _disposeRecursively(error) {
    (0, import_utils.assert)(!this._disposed, `${this._guid} is disposed more than once`);
    this._onDispose();
    this._disposed = true;
    import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
    this._parent?._dispatchers.delete(this._guid);
    const list = this._connection._dispatchersByBucket.get(this._gcBucket);
    list?.delete(this._guid);
    this._connection._dispatchers.delete(this._guid);
    for (const dispatcher of [...this._dispatchers.values()])
      dispatcher._disposeRecursively(error);
    this._dispatchers.clear();
    delete this._object[dispatcherSymbol];
    this._openScope.close(error);
  }
  _debugScopeState() {
    return {
      _guid: this._guid,
      objects: Array.from(this._dispatchers.values()).map((o) => o._debugScopeState())
    };
  }
  async waitForEventInfo() {
  }
}
class RootDispatcher extends Dispatcher {
  constructor(connection, createPlaywright) {
    super(connection, { guid: "" }, "Root", {});
    this.createPlaywright = createPlaywright;
    this._initialized = false;
  }
  async initialize(params) {
    (0, import_utils.assert)(this.createPlaywright);
    (0, import_utils.assert)(!this._initialized);
    this._initialized = true;
    return {
      playwright: await this.createPlaywright(this, params)
    };
  }
}
class DispatcherConnection {
  constructor(isLocal) {
    this._dispatchers = /* @__PURE__ */ new Map();
    this._dispatchersByBucket = /* @__PURE__ */ new Map();
    this.onmessage = (message) => {
    };
    this._waitOperations = /* @__PURE__ */ new Map();
    this._isLocal = !!isLocal;
  }
  sendEvent(dispatcher, event, params) {
    const validator = (0, import_validator.findValidator)(dispatcher._type, event, "Event");
    params = validator(params, "", this._validatorToWireContext());
    this.onmessage({ guid: dispatcher._guid, method: event, params });
  }
  sendCreate(parent, type, guid, initializer) {
    const validator = (0, import_validator.findValidator)(type, "", "Initializer");
    initializer = validator(initializer, "", this._validatorToWireContext());
    this.onmessage({ guid: parent._guid, method: "__create__", params: { type, initializer, guid } });
  }
  sendAdopt(parent, dispatcher) {
    this.onmessage({ guid: parent._guid, method: "__adopt__", params: { guid: dispatcher._guid } });
  }
  sendDispose(dispatcher, reason) {
    this.onmessage({ guid: dispatcher._guid, method: "__dispose__", params: { reason } });
  }
  _validatorToWireContext() {
    return {
      tChannelImpl: this._tChannelImplToWire.bind(this),
      binary: this._isLocal ? "buffer" : "toBase64",
      isUnderTest: import_debug.isUnderTest
    };
  }
  _validatorFromWireContext() {
    return {
      tChannelImpl: this._tChannelImplFromWire.bind(this),
      binary: this._isLocal ? "buffer" : "fromBase64",
      isUnderTest: import_debug.isUnderTest
    };
  }
  _tChannelImplFromWire(names, arg, path, context) {
    if (arg && typeof arg === "object" && typeof arg.guid === "string") {
      const guid = arg.guid;
      const dispatcher = this._dispatchers.get(guid);
      if (!dispatcher)
        throw new import_validator.ValidationError(`${path}: no object with guid ${guid}`);
      if (names !== "*" && !names.includes(dispatcher._type))
        throw new import_validator.ValidationError(`${path}: object with guid ${guid} has type ${dispatcher._type}, expected ${names.toString()}`);
      return dispatcher;
    }
    throw new import_validator.ValidationError(`${path}: expected guid for ${names.toString()}`);
  }
  _tChannelImplToWire(names, arg, path, context) {
    if (arg instanceof Dispatcher) {
      if (names !== "*" && !names.includes(arg._type))
        throw new import_validator.ValidationError(`${path}: dispatcher with guid ${arg._guid} has type ${arg._type}, expected ${names.toString()}`);
      return { guid: arg._guid };
    }
    throw new import_validator.ValidationError(`${path}: expected dispatcher ${names.toString()}`);
  }
  registerDispatcher(dispatcher) {
    (0, import_utils.assert)(!this._dispatchers.has(dispatcher._guid));
    this._dispatchers.set(dispatcher._guid, dispatcher);
    let list = this._dispatchersByBucket.get(dispatcher._gcBucket);
    if (!list) {
      list = /* @__PURE__ */ new Set();
      this._dispatchersByBucket.set(dispatcher._gcBucket, list);
    }
    list.add(dispatcher._guid);
  }
  maybeDisposeStaleDispatchers(gcBucket) {
    const maxDispatchers = maxDispatchersForBucket(gcBucket);
    const list = this._dispatchersByBucket.get(gcBucket);
    if (!list || list.size <= maxDispatchers)
      return;
    const dispatchersArray = [...list];
    const disposeCount = maxDispatchers / 10 | 0;
    this._dispatchersByBucket.set(gcBucket, new Set(dispatchersArray.slice(disposeCount)));
    for (let i = 0; i < disposeCount; ++i) {
      const d = this._dispatchers.get(dispatchersArray[i]);
      if (!d)
        continue;
      d._dispose("gc");
    }
  }
  async dispatch(message) {
    const { id, guid, method, params, metadata } = message;
    const dispatcher = this._dispatchers.get(guid);
    if (!dispatcher) {
      this.onmessage({ id, error: (0, import_errors.serializeError)(new import_errors.TargetClosedError()) });
      return;
    }
    let validParams;
    let validMetadata;
    try {
      const validator = (0, import_validator.findValidator)(dispatcher._type, method, "Params");
      const validatorContext = this._validatorFromWireContext();
      validParams = validator(params, "", validatorContext);
      validMetadata = metadataValidator(metadata, "", validatorContext);
      if (typeof dispatcher[method] !== "function")
        throw new Error(`Mismatching dispatcher: "${dispatcher._type}" does not implement "${method}"`);
    } catch (e) {
      this.onmessage({ id, error: (0, import_errors.serializeError)(e) });
      return;
    }
    const sdkObject = dispatcher._object instanceof import_instrumentation.SdkObject ? dispatcher._object : void 0;
    const callMetadata = {
      id: `call@${id}`,
      location: validMetadata.location,
      apiName: validMetadata.apiName,
      internal: validMetadata.internal,
      stepId: validMetadata.stepId,
      objectId: sdkObject?.guid,
      pageId: sdkObject?.attribution?.page?.guid,
      frameId: sdkObject?.attribution?.frame?.guid,
      startTime: (0, import_utils.monotonicTime)(),
      endTime: 0,
      type: dispatcher._type,
      method,
      params: params || {},
      log: []
    };
    if (sdkObject && params?.info?.waitId) {
      const info = params.info;
      switch (info.phase) {
        case "before": {
          this._waitOperations.set(info.waitId, callMetadata);
          await sdkObject.instrumentation.onBeforeCall(sdkObject, callMetadata);
          this.onmessage({ id });
          return;
        }
        case "log": {
          const originalMetadata = this._waitOperations.get(info.waitId);
          originalMetadata.log.push(info.message);
          sdkObject.instrumentation.onCallLog(sdkObject, originalMetadata, "api", info.message);
          this.onmessage({ id });
          return;
        }
        case "after": {
          const originalMetadata = this._waitOperations.get(info.waitId);
          originalMetadata.endTime = (0, import_utils.monotonicTime)();
          originalMetadata.error = info.error ? { error: { name: "Error", message: info.error } } : void 0;
          this._waitOperations.delete(info.waitId);
          await sdkObject.instrumentation.onAfterCall(sdkObject, originalMetadata);
          this.onmessage({ id });
          return;
        }
      }
    }
    await sdkObject?.instrumentation.onBeforeCall(sdkObject, callMetadata);
    const response = { id };
    try {
      const result = await dispatcher._handleCommand(callMetadata, method, validParams);
      const validator = (0, import_validator.findValidator)(dispatcher._type, method, "Result");
      response.result = validator(result, "", this._validatorToWireContext());
      callMetadata.result = result;
    } catch (e) {
      if ((0, import_errors.isTargetClosedError)(e) && sdkObject) {
        const reason = closeReason(sdkObject);
        if (reason)
          (0, import_utils.rewriteErrorMessage)(e, reason);
      } else if ((0, import_protocolError.isProtocolError)(e)) {
        if (e.type === "closed") {
          const reason = sdkObject ? closeReason(sdkObject) : void 0;
          e = new import_errors.TargetClosedError(reason, e.browserLogMessage());
        } else if (e.type === "crashed") {
          (0, import_utils.rewriteErrorMessage)(e, "Target crashed " + e.browserLogMessage());
        }
      }
      response.error = (0, import_errors.serializeError)(e);
      callMetadata.error = response.error;
    } finally {
      callMetadata.endTime = (0, import_utils.monotonicTime)();
      await sdkObject?.instrumentation.onAfterCall(sdkObject, callMetadata);
    }
    if (response.error)
      response.log = (0, import_callLog.compressCallLog)(callMetadata.log);
    this.onmessage(response);
  }
}
function closeReason(sdkObject) {
  return sdkObject.attribution.page?._closeReason || sdkObject.attribution.context?._closeReason || sdkObject.attribution.browser?._closeReason;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Dispatcher,
  DispatcherConnection,
  RootDispatcher,
  dispatcherSymbol,
  existingDispatcher,
  setMaxDispatchersForTest
});

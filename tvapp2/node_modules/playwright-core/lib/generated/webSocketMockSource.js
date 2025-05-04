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
var webSocketMockSource_exports = {};
__export(webSocketMockSource_exports, {
  source: () => source
});
module.exports = __toCommonJS(webSocketMockSource_exports);
const source = `
var __commonJS = obj => {
  let required = false;
  let result;
  return function __require() {
    if (!required) {
      required = true;
      let fn;
      for (const name in obj) { fn = obj[name]; break; }
      const module = { exports: {} };
      fn(module.exports, module);
      result = module.exports;
    }
    return result;
  }
};
var __export = (target, all) => {for (var name in all) target[name] = all[name];};
var __toESM = mod => ({ ...mod, 'default': mod });
var __toCommonJS = mod => ({ ...mod, __esModule: true });


// packages/injected/src/webSocketMock.ts
var webSocketMock_exports = {};
__export(webSocketMock_exports, {
  inject: () => inject
});
module.exports = __toCommonJS(webSocketMock_exports);

// packages/playwright-core/src/utils/isomorphic/builtins.ts
function builtins(global) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  global = global != null ? global : globalThis;
  if (!global["__playwright_builtins__"]) {
    const builtins2 = {
      setTimeout: (_a = global.setTimeout) == null ? void 0 : _a.bind(global),
      clearTimeout: (_b = global.clearTimeout) == null ? void 0 : _b.bind(global),
      setInterval: (_c = global.setInterval) == null ? void 0 : _c.bind(global),
      clearInterval: (_d = global.clearInterval) == null ? void 0 : _d.bind(global),
      requestAnimationFrame: (_e = global.requestAnimationFrame) == null ? void 0 : _e.bind(global),
      cancelAnimationFrame: (_f = global.cancelAnimationFrame) == null ? void 0 : _f.bind(global),
      requestIdleCallback: (_g = global.requestIdleCallback) == null ? void 0 : _g.bind(global),
      cancelIdleCallback: (_h = global.cancelIdleCallback) == null ? void 0 : _h.bind(global),
      performance: global.performance,
      eval: (_i = global.eval) == null ? void 0 : _i.bind(global),
      Intl: global.Intl,
      Date: global.Date,
      Map: global.Map,
      Set: global.Set
    };
    Object.defineProperty(global, "__playwright_builtins__", { value: builtins2, configurable: false, enumerable: false, writable: false });
  }
  return global["__playwright_builtins__"];
}
var instance = builtins();
var setTimeout = instance.setTimeout;
var clearTimeout = instance.clearTimeout;
var setInterval = instance.setInterval;
var clearInterval = instance.clearInterval;
var requestAnimationFrame = instance.requestAnimationFrame;
var cancelAnimationFrame = instance.cancelAnimationFrame;
var requestIdleCallback = instance.requestIdleCallback;
var cancelIdleCallback = instance.cancelIdleCallback;
var performance = instance.performance;
var Intl = instance.Intl;
var Date = instance.Date;
var Map = instance.Map;
var Set = instance.Set;

// packages/injected/src/webSocketMock.ts
function inject(globalThis2) {
  if (globalThis2.__pwWebSocketDispatch)
    return;
  function generateId() {
    const bytes = new Uint8Array(32);
    globalThis2.crypto.getRandomValues(bytes);
    const hex = "0123456789abcdef";
    return [...bytes].map((value) => {
      const high = Math.floor(value / 16);
      const low = value % 16;
      return hex[high] + hex[low];
    }).join("");
  }
  function bufferToData(b) {
    let s = "";
    for (let i = 0; i < b.length; i++)
      s += String.fromCharCode(b[i]);
    return { data: globalThis2.btoa(s), isBase64: true };
  }
  function stringToBuffer(s) {
    s = globalThis2.atob(s);
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++)
      b[i] = s.charCodeAt(i);
    return b.buffer;
  }
  function messageToData(message, cb) {
    if (message instanceof globalThis2.Blob)
      return message.arrayBuffer().then((buffer) => cb(bufferToData(new Uint8Array(buffer))));
    if (typeof message === "string")
      return cb({ data: message, isBase64: false });
    if (ArrayBuffer.isView(message))
      return cb(bufferToData(new Uint8Array(message.buffer, message.byteOffset, message.byteLength)));
    return cb(bufferToData(new Uint8Array(message)));
  }
  function dataToMessage(data, binaryType) {
    if (!data.isBase64)
      return data.data;
    const buffer = stringToBuffer(data.data);
    return binaryType === "arraybuffer" ? buffer : new Blob([buffer]);
  }
  const binding = globalThis2.__pwWebSocketBinding;
  const NativeWebSocket = globalThis2.WebSocket;
  const idToWebSocket = new Map();
  globalThis2.__pwWebSocketDispatch = (request) => {
    const ws = idToWebSocket.get(request.id);
    if (!ws)
      return;
    if (request.type === "connect")
      ws._apiConnect();
    if (request.type === "passthrough")
      ws._apiPassThrough();
    if (request.type === "ensureOpened")
      ws._apiEnsureOpened();
    if (request.type === "sendToPage")
      ws._apiSendToPage(dataToMessage(request.data, ws.binaryType));
    if (request.type === "closePage")
      ws._apiClosePage(request.code, request.reason, request.wasClean);
    if (request.type === "sendToServer")
      ws._apiSendToServer(dataToMessage(request.data, ws.binaryType));
    if (request.type === "closeServer")
      ws._apiCloseServer(request.code, request.reason, request.wasClean);
  };
  const _WebSocketMock = class _WebSocketMock extends EventTarget {
    constructor(url, protocols) {
      var _a, _b;
      super();
      // WebSocket.CLOSED
      this.CONNECTING = 0;
      // WebSocket.CONNECTING
      this.OPEN = 1;
      // WebSocket.OPEN
      this.CLOSING = 2;
      // WebSocket.CLOSING
      this.CLOSED = 3;
      // WebSocket.CLOSED
      this._oncloseListener = null;
      this._onerrorListener = null;
      this._onmessageListener = null;
      this._onopenListener = null;
      this.bufferedAmount = 0;
      this.extensions = "";
      this.protocol = "";
      this.readyState = 0;
      this._origin = "";
      this._passthrough = false;
      this._wsBufferedMessages = [];
      this._binaryType = "blob";
      this.url = new URL(url, globalThis2.window.document.baseURI).href.replace(/^http/, "ws");
      this._origin = (_b = (_a = URL.parse(this.url)) == null ? void 0 : _a.origin) != null ? _b : "";
      this._protocols = protocols;
      this._id = generateId();
      idToWebSocket.set(this._id, this);
      binding({ type: "onCreate", id: this._id, url: this.url });
    }
    // --- native WebSocket implementation ---
    get binaryType() {
      return this._binaryType;
    }
    set binaryType(type) {
      this._binaryType = type;
      if (this._ws)
        this._ws.binaryType = type;
    }
    get onclose() {
      return this._oncloseListener;
    }
    set onclose(listener) {
      if (this._oncloseListener)
        this.removeEventListener("close", this._oncloseListener);
      this._oncloseListener = listener;
      if (this._oncloseListener)
        this.addEventListener("close", this._oncloseListener);
    }
    get onerror() {
      return this._onerrorListener;
    }
    set onerror(listener) {
      if (this._onerrorListener)
        this.removeEventListener("error", this._onerrorListener);
      this._onerrorListener = listener;
      if (this._onerrorListener)
        this.addEventListener("error", this._onerrorListener);
    }
    get onopen() {
      return this._onopenListener;
    }
    set onopen(listener) {
      if (this._onopenListener)
        this.removeEventListener("open", this._onopenListener);
      this._onopenListener = listener;
      if (this._onopenListener)
        this.addEventListener("open", this._onopenListener);
    }
    get onmessage() {
      return this._onmessageListener;
    }
    set onmessage(listener) {
      if (this._onmessageListener)
        this.removeEventListener("message", this._onmessageListener);
      this._onmessageListener = listener;
      if (this._onmessageListener)
        this.addEventListener("message", this._onmessageListener);
    }
    send(message) {
      if (this.readyState === _WebSocketMock.CONNECTING)
        throw new DOMException(\`Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.\`);
      if (this.readyState !== _WebSocketMock.OPEN)
        throw new DOMException(\`WebSocket is already in CLOSING or CLOSED state.\`);
      if (this._passthrough) {
        if (this._ws)
          this._apiSendToServer(message);
      } else {
        messageToData(message, (data) => binding({ type: "onMessageFromPage", id: this._id, data }));
      }
    }
    close(code, reason) {
      if (code !== void 0 && code !== 1e3 && (code < 3e3 || code > 4999))
        throw new DOMException(\`Failed to execute 'close' on 'WebSocket': The close code must be either 1000, or between 3000 and 4999. \${code} is neither.\`);
      if (this.readyState === _WebSocketMock.OPEN || this.readyState === _WebSocketMock.CONNECTING)
        this.readyState = _WebSocketMock.CLOSING;
      if (this._passthrough)
        this._apiCloseServer(code, reason, true);
      else
        binding({ type: "onClosePage", id: this._id, code, reason, wasClean: true });
    }
    // --- methods called from the routing API ---
    _apiEnsureOpened() {
      if (!this._ws)
        this._ensureOpened();
    }
    _apiSendToPage(message) {
      this._ensureOpened();
      if (this.readyState !== _WebSocketMock.OPEN)
        throw new DOMException(\`WebSocket is already in CLOSING or CLOSED state.\`);
      this.dispatchEvent(new MessageEvent("message", { data: message, origin: this._origin, cancelable: true }));
    }
    _apiSendToServer(message) {
      if (!this._ws)
        throw new Error("Cannot send a message before connecting to the server");
      if (this._ws.readyState === _WebSocketMock.CONNECTING)
        this._wsBufferedMessages.push(message);
      else
        this._ws.send(message);
    }
    _apiConnect() {
      if (this._ws)
        throw new Error("Can only connect to the server once");
      this._ws = new NativeWebSocket(this.url, this._protocols);
      this._ws.binaryType = this._binaryType;
      this._ws.onopen = () => {
        for (const message of this._wsBufferedMessages)
          this._ws.send(message);
        this._wsBufferedMessages = [];
        this._ensureOpened();
      };
      this._ws.onclose = (event) => {
        this._onWSClose(event.code, event.reason, event.wasClean);
      };
      this._ws.onmessage = (event) => {
        if (this._passthrough)
          this._apiSendToPage(event.data);
        else
          messageToData(event.data, (data) => binding({ type: "onMessageFromServer", id: this._id, data }));
      };
      this._ws.onerror = () => {
        const event = new Event("error", { cancelable: true });
        this.dispatchEvent(event);
      };
    }
    // This method connects to the server, and passes all messages through,
    // as if WebSocketMock was not engaged.
    _apiPassThrough() {
      this._passthrough = true;
      this._apiConnect();
    }
    _apiCloseServer(code, reason, wasClean) {
      if (!this._ws) {
        this._onWSClose(code, reason, wasClean);
        return;
      }
      if (this._ws.readyState === _WebSocketMock.CONNECTING || this._ws.readyState === _WebSocketMock.OPEN)
        this._ws.close(code, reason);
    }
    _apiClosePage(code, reason, wasClean) {
      if (this.readyState === _WebSocketMock.CLOSED)
        return;
      this.readyState = _WebSocketMock.CLOSED;
      this.dispatchEvent(new CloseEvent("close", { code, reason, wasClean, cancelable: true }));
      this._maybeCleanup();
      if (this._passthrough)
        this._apiCloseServer(code, reason, wasClean);
      else
        binding({ type: "onClosePage", id: this._id, code, reason, wasClean });
    }
    // --- internals ---
    _ensureOpened() {
      var _a;
      if (this.readyState !== _WebSocketMock.CONNECTING)
        return;
      this.extensions = ((_a = this._ws) == null ? void 0 : _a.extensions) || "";
      if (this._ws)
        this.protocol = this._ws.protocol;
      else if (Array.isArray(this._protocols))
        this.protocol = this._protocols[0] || "";
      else
        this.protocol = this._protocols || "";
      this.readyState = _WebSocketMock.OPEN;
      this.dispatchEvent(new Event("open", { cancelable: true }));
    }
    _onWSClose(code, reason, wasClean) {
      if (this._passthrough)
        this._apiClosePage(code, reason, wasClean);
      else
        binding({ type: "onCloseServer", id: this._id, code, reason, wasClean });
      if (this._ws) {
        this._ws.onopen = null;
        this._ws.onclose = null;
        this._ws.onmessage = null;
        this._ws.onerror = null;
        this._ws = void 0;
        this._wsBufferedMessages = [];
      }
      this._maybeCleanup();
    }
    _maybeCleanup() {
      if (this.readyState === _WebSocketMock.CLOSED && !this._ws)
        idToWebSocket.delete(this._id);
    }
  };
  _WebSocketMock.CONNECTING = 0;
  // WebSocket.CONNECTING
  _WebSocketMock.OPEN = 1;
  // WebSocket.OPEN
  _WebSocketMock.CLOSING = 2;
  // WebSocket.CLOSING
  _WebSocketMock.CLOSED = 3;
  let WebSocketMock = _WebSocketMock;
  globalThis2.WebSocket = class WebSocket extends WebSocketMock {
  };
}
`;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  source
});

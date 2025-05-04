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
var crInput_exports = {};
__export(crInput_exports, {
  RawKeyboardImpl: () => RawKeyboardImpl,
  RawMouseImpl: () => RawMouseImpl,
  RawTouchscreenImpl: () => RawTouchscreenImpl
});
module.exports = __toCommonJS(crInput_exports);
var import_utils = require("../../utils");
var input = __toESM(require("../input"));
var import_macEditingCommands = require("../macEditingCommands");
var import_crProtocolHelper = require("./crProtocolHelper");
class RawKeyboardImpl {
  constructor(_client, _isMac, _dragManger) {
    this._client = _client;
    this._isMac = _isMac;
    this._dragManger = _dragManger;
  }
  _commandsForCode(code, modifiers) {
    if (!this._isMac)
      return [];
    const parts = [];
    for (const modifier of ["Shift", "Control", "Alt", "Meta"]) {
      if (modifiers.has(modifier))
        parts.push(modifier);
    }
    parts.push(code);
    const shortcut = parts.join("+");
    let commands = import_macEditingCommands.macEditingCommands[shortcut] || [];
    if ((0, import_utils.isString)(commands))
      commands = [commands];
    commands = commands.filter((x) => !x.startsWith("insert"));
    return commands.map((c) => c.substring(0, c.length - 1));
  }
  async keydown(modifiers, keyName, description, autoRepeat) {
    const { code, key, location, text } = description;
    if (code === "Escape" && await this._dragManger.cancelDrag())
      return;
    const commands = this._commandsForCode(code, modifiers);
    await this._client.send("Input.dispatchKeyEvent", {
      type: text ? "keyDown" : "rawKeyDown",
      modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers),
      windowsVirtualKeyCode: description.keyCodeWithoutLocation,
      code,
      commands,
      key,
      text,
      unmodifiedText: text,
      autoRepeat,
      location,
      isKeypad: location === input.keypadLocation
    });
  }
  async keyup(modifiers, keyName, description) {
    const { code, key, location } = description;
    await this._client.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers),
      key,
      windowsVirtualKeyCode: description.keyCodeWithoutLocation,
      code,
      location
    });
  }
  async sendText(text) {
    await this._client.send("Input.insertText", { text });
  }
}
class RawMouseImpl {
  constructor(page, client, dragManager) {
    this._page = page;
    this._client = client;
    this._dragManager = dragManager;
  }
  async move(x, y, button, buttons, modifiers, forClick) {
    const actualMove = async () => {
      await this._client.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        button,
        buttons: (0, import_crProtocolHelper.toButtonsMask)(buttons),
        x,
        y,
        modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers)
      });
    };
    if (forClick) {
      return actualMove();
    }
    await this._dragManager.interceptDragCausedByMove(x, y, button, buttons, modifiers, actualMove);
  }
  async down(x, y, button, buttons, modifiers, clickCount) {
    if (this._dragManager.isDragging())
      return;
    await this._client.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      button,
      buttons: (0, import_crProtocolHelper.toButtonsMask)(buttons),
      x,
      y,
      modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers),
      clickCount
    });
  }
  async up(x, y, button, buttons, modifiers, clickCount) {
    if (this._dragManager.isDragging()) {
      await this._dragManager.drop(x, y, modifiers);
      return;
    }
    await this._client.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      button,
      buttons: (0, import_crProtocolHelper.toButtonsMask)(buttons),
      x,
      y,
      modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers),
      clickCount
    });
  }
  async wheel(x, y, buttons, modifiers, deltaX, deltaY) {
    await this._client.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x,
      y,
      modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers),
      deltaX,
      deltaY
    });
  }
}
class RawTouchscreenImpl {
  constructor(client) {
    this._client = client;
  }
  async tap(x, y, modifiers) {
    await Promise.all([
      this._client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers),
        touchPoints: [{
          x,
          y
        }]
      }),
      this._client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers),
        touchPoints: []
      })
    ]);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RawKeyboardImpl,
  RawMouseImpl,
  RawTouchscreenImpl
});

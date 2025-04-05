"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WKExecutionContext = void 0;
exports.createHandle = createHandle;
var _utilityScriptSerializers = require("../isomorphic/utilityScriptSerializers");
var js = _interopRequireWildcard(require("../javascript"));
var dom = _interopRequireWildcard(require("../dom"));
var _protocolError = require("../protocolError");
var _assert = require("../../utils/isomorphic/assert");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * Copyright 2017 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class WKExecutionContext {
  constructor(session, contextId) {
    this._session = void 0;
    this._contextId = void 0;
    this._session = session;
    this._contextId = contextId;
  }
  async rawEvaluateJSON(expression) {
    try {
      const response = await this._session.send('Runtime.evaluate', {
        expression,
        contextId: this._contextId,
        returnByValue: true
      });
      if (response.wasThrown) throw new js.JavaScriptErrorInEvaluate(response.result.description);
      return response.result.value;
    } catch (error) {
      throw rewriteError(error);
    }
  }
  async rawEvaluateHandle(context, expression) {
    try {
      const response = await this._session.send('Runtime.evaluate', {
        expression,
        contextId: this._contextId,
        returnByValue: false
      });
      if (response.wasThrown) throw new js.JavaScriptErrorInEvaluate(response.result.description);
      return createHandle(context, response.result);
    } catch (error) {
      throw rewriteError(error);
    }
  }
  async evaluateWithArguments(expression, returnByValue, utilityScript, values, handles) {
    try {
      const response = await this._session.send('Runtime.callFunctionOn', {
        functionDeclaration: expression,
        objectId: utilityScript._objectId,
        arguments: [{
          objectId: utilityScript._objectId
        }, ...values.map(value => ({
          value
        })), ...handles.map(handle => ({
          objectId: handle._objectId
        }))],
        returnByValue,
        emulateUserGesture: true,
        awaitPromise: true
      });
      if (response.wasThrown) throw new js.JavaScriptErrorInEvaluate(response.result.description);
      if (returnByValue) return (0, _utilityScriptSerializers.parseEvaluationResultValue)(response.result.value);
      return createHandle(utilityScript._context, response.result);
    } catch (error) {
      throw rewriteError(error);
    }
  }
  async getProperties(object) {
    const response = await this._session.send('Runtime.getProperties', {
      objectId: object._objectId,
      ownProperties: true
    });
    const result = new Map();
    for (const property of response.properties) {
      if (!property.enumerable || !property.value) continue;
      result.set(property.name, createHandle(object._context, property.value));
    }
    return result;
  }
  async releaseHandle(handle) {
    if (!handle._objectId) return;
    await this._session.send('Runtime.releaseObject', {
      objectId: handle._objectId
    });
  }
}
exports.WKExecutionContext = WKExecutionContext;
function potentiallyUnserializableValue(remoteObject) {
  const value = remoteObject.value;
  const isUnserializable = remoteObject.type === 'number' && ['NaN', '-Infinity', 'Infinity', '-0'].includes(remoteObject.description);
  return isUnserializable ? js.parseUnserializableValue(remoteObject.description) : value;
}
function rewriteError(error) {
  if (error.message.includes('Object has too long reference chain')) throw new Error('Cannot serialize result: object reference chain is too long.');
  if (!js.isJavaScriptErrorInEvaluate(error) && !(0, _protocolError.isSessionClosedError)(error)) return new Error('Execution context was destroyed, most likely because of a navigation.');
  return error;
}
function renderPreview(object) {
  if (object.type === 'undefined') return 'undefined';
  if ('value' in object) return String(object.value);
  if (object.description === 'Object' && object.preview) {
    const tokens = [];
    for (const {
      name,
      value
    } of object.preview.properties) tokens.push(`${name}: ${value}`);
    return `{${tokens.join(', ')}}`;
  }
  if (object.subtype === 'array' && object.preview) return js.sparseArrayToString(object.preview.properties);
  return object.description;
}
function createHandle(context, remoteObject) {
  if (remoteObject.subtype === 'node') {
    (0, _assert.assert)(context instanceof dom.FrameExecutionContext);
    return new dom.ElementHandle(context, remoteObject.objectId);
  }
  const isPromise = remoteObject.className === 'Promise';
  return new js.JSHandle(context, isPromise ? 'promise' : remoteObject.subtype || remoteObject.type, renderPreview(remoteObject), remoteObject.objectId, potentiallyUnserializableValue(remoteObject));
}
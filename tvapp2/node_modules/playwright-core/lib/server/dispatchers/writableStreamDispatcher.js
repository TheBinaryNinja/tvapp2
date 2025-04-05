"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WritableStreamDispatcher = void 0;
var _fs = _interopRequireDefault(require("fs"));
var _dispatcher = require("./dispatcher");
var _crypto = require("../utils/crypto");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class WritableStreamDispatcher extends _dispatcher.Dispatcher {
  constructor(scope, streamOrDirectory, lastModifiedMs) {
    super(scope, {
      guid: 'writableStream@' + (0, _crypto.createGuid)(),
      streamOrDirectory
    }, 'WritableStream', {});
    this._type_WritableStream = true;
    this._lastModifiedMs = void 0;
    this._lastModifiedMs = lastModifiedMs;
  }
  async write(params) {
    if (typeof this._object.streamOrDirectory === 'string') throw new Error('Cannot write to a directory');
    const stream = this._object.streamOrDirectory;
    await new Promise((fulfill, reject) => {
      stream.write(params.binary, error => {
        if (error) reject(error);else fulfill();
      });
    });
  }
  async close() {
    if (typeof this._object.streamOrDirectory === 'string') throw new Error('Cannot close a directory');
    const stream = this._object.streamOrDirectory;
    await new Promise(fulfill => stream.end(fulfill));
    if (this._lastModifiedMs) await _fs.default.promises.utimes(this.path(), new Date(this._lastModifiedMs), new Date(this._lastModifiedMs));
  }
  path() {
    if (typeof this._object.streamOrDirectory === 'string') return this._object.streamOrDirectory;
    return this._object.streamOrDirectory.path;
  }
}
exports.WritableStreamDispatcher = WritableStreamDispatcher;
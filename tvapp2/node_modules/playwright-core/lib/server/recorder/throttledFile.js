"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ThrottledFile = void 0;
var _fs = _interopRequireDefault(require("fs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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

class ThrottledFile {
  constructor(file) {
    this._file = void 0;
    this._timer = void 0;
    this._text = void 0;
    this._file = file;
  }
  setContent(text) {
    this._text = text;
    if (!this._timer) this._timer = setTimeout(() => this.flush(), 250);
  }
  flush() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
    if (this._text) _fs.default.writeFileSync(this._file, this._text);
    this._text = undefined;
  }
}
exports.ThrottledFile = ThrottledFile;
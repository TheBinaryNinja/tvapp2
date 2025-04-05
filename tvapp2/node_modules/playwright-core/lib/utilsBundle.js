"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.minimatch = exports.mime = exports.lockfile = exports.jpegjs = exports.getProxyForUrl = exports.dotenv = exports.diff = exports.debug = exports.colors = exports.SocksProxyAgent = exports.PNG = exports.HttpsProxyAgent = void 0;
exports.ms = ms;
exports.yaml = exports.wsServer = exports.wsSender = exports.wsReceiver = exports.ws = exports.progress = exports.program = exports.open = void 0;
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

const colors = exports.colors = require('./utilsBundleImpl').colors;
const debug = exports.debug = require('./utilsBundleImpl').debug;
const diff = exports.diff = require('./utilsBundleImpl').diff;
const dotenv = exports.dotenv = require('./utilsBundleImpl').dotenv;
const getProxyForUrl = exports.getProxyForUrl = require('./utilsBundleImpl').getProxyForUrl;
const HttpsProxyAgent = exports.HttpsProxyAgent = require('./utilsBundleImpl').HttpsProxyAgent;
const jpegjs = exports.jpegjs = require('./utilsBundleImpl').jpegjs;
const lockfile = exports.lockfile = require('./utilsBundleImpl').lockfile;
const mime = exports.mime = require('./utilsBundleImpl').mime;
const minimatch = exports.minimatch = require('./utilsBundleImpl').minimatch;
const open = exports.open = require('./utilsBundleImpl').open;
const PNG = exports.PNG = require('./utilsBundleImpl').PNG;
const program = exports.program = require('./utilsBundleImpl').program;
const progress = exports.progress = require('./utilsBundleImpl').progress;
const SocksProxyAgent = exports.SocksProxyAgent = require('./utilsBundleImpl').SocksProxyAgent;
const yaml = exports.yaml = require('./utilsBundleImpl').yaml;
const ws = exports.ws = require('./utilsBundleImpl').ws;
const wsServer = exports.wsServer = require('./utilsBundleImpl').wsServer;
const wsReceiver = exports.wsReceiver = require('./utilsBundleImpl').wsReceiver;
const wsSender = exports.wsSender = require('./utilsBundleImpl').wsSender;
function ms(ms) {
  if (!isFinite(ms)) return '-';
  if (ms === 0) return '0ms';
  if (ms < 1000) return ms.toFixed(0) + 'ms';
  const seconds = ms / 1000;
  if (seconds < 60) return seconds.toFixed(1) + 's';
  const minutes = seconds / 60;
  if (minutes < 60) return minutes.toFixed(1) + 'm';
  const hours = minutes / 60;
  if (hours < 24) return hours.toFixed(1) + 'h';
  const days = hours / 24;
  return days.toFixed(1) + 'd';
}
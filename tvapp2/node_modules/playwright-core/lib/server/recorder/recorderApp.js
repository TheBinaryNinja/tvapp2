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
var recorderApp_exports = {};
__export(recorderApp_exports, {
  EmptyRecorderApp: () => EmptyRecorderApp,
  RecorderApp: () => RecorderApp
});
module.exports = __toCommonJS(recorderApp_exports);
var import_events = require("events");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_debug = require("../utils/debug");
var import_utilsBundle = require("../../utilsBundle");
var import_instrumentation = require("../instrumentation");
var import_launchApp = require("../launchApp");
var import_launchApp2 = require("../launchApp");
var import_progress = require("../progress");
class EmptyRecorderApp extends import_events.EventEmitter {
  async close() {
  }
  async setPaused(paused) {
  }
  async setMode(mode) {
  }
  async setRunningFile(file) {
  }
  async elementPicked(elementInfo, userGesture) {
  }
  async updateCallLogs(callLogs) {
  }
  async setSources(sources, primaryPageURL) {
  }
  async setActions(actions, sources) {
  }
}
class RecorderApp extends import_events.EventEmitter {
  constructor(recorder, page, wsEndpoint) {
    super();
    this.setMaxListeners(0);
    this._recorder = recorder;
    this._page = page;
    this.wsEndpointForTest = wsEndpoint;
  }
  async close() {
    await this._page.context().close({ reason: "Recorder window closed" });
  }
  async _init() {
    await (0, import_launchApp.syncLocalStorageWithSettings)(this._page, "recorder");
    await this._page._setServerRequestInterceptor((route) => {
      if (!route.request().url().startsWith("https://playwright/"))
        return false;
      const uri = route.request().url().substring("https://playwright/".length);
      const file = require.resolve("../../vite/recorder/" + uri);
      import_fs.default.promises.readFile(file).then((buffer) => {
        route.fulfill({
          status: 200,
          headers: [
            { name: "Content-Type", value: import_utilsBundle.mime.getType(import_path.default.extname(file)) || "application/octet-stream" }
          ],
          body: buffer.toString("base64"),
          isBase64: true
        }).catch(() => {
        });
      });
      return true;
    });
    await this._page.exposeBinding("dispatch", false, (_, data) => this.emit("event", data));
    this._page.once("close", () => {
      this.emit("close");
      this._page.context().close({ reason: "Recorder window closed" }).catch(() => {
      });
    });
    const mainFrame = this._page.mainFrame();
    await mainFrame.goto((0, import_instrumentation.serverSideCallMetadata)(), process.env.PW_HMR ? "http://localhost:44225" : "https://playwright/index.html");
  }
  static factory(context) {
    return async (recorder) => {
      if (process.env.PW_CODEGEN_NO_INSPECTOR)
        return new EmptyRecorderApp();
      return await RecorderApp._open(recorder, context);
    };
  }
  static async _open(recorder, inspectedContext) {
    const sdkLanguage = inspectedContext.attribution.playwright.options.sdkLanguage;
    const headed = !!inspectedContext._browser.options.headful;
    const recorderPlaywright = require("../playwright").createPlaywright({ sdkLanguage: "javascript", isInternalPlaywright: true });
    const { context, page } = await (0, import_launchApp2.launchApp)(recorderPlaywright.chromium, {
      sdkLanguage,
      windowSize: { width: 600, height: 600 },
      windowPosition: { x: 1020, y: 10 },
      persistentContextOptions: {
        noDefaultViewport: true,
        headless: !!process.env.PWTEST_CLI_HEADLESS || (0, import_debug.isUnderTest)() && !headed,
        useWebSocket: (0, import_debug.isUnderTest)(),
        handleSIGINT: recorder.handleSIGINT,
        executablePath: inspectedContext._browser.options.isChromium ? inspectedContext._browser.options.customExecutablePath : void 0,
        // Use the same channel as the inspected context to guarantee that the browser is installed.
        channel: inspectedContext._browser.options.isChromium ? inspectedContext._browser.options.channel : void 0
      }
    });
    const controller = new import_progress.ProgressController((0, import_instrumentation.serverSideCallMetadata)(), context._browser);
    await controller.run(async (progress) => {
      await context._browser._defaultContext._loadDefaultContextAsIs(progress);
    });
    const result = new RecorderApp(recorder, page, context._browser.options.wsEndpoint);
    await result._init();
    return result;
  }
  async setMode(mode) {
    await this._page.mainFrame().evaluateExpression(((mode2) => {
      window.playwrightSetMode(mode2);
    }).toString(), { isFunction: true }, mode).catch(() => {
    });
  }
  async setRunningFile(file) {
    await this._page.mainFrame().evaluateExpression(((file2) => {
      window.playwrightSetRunningFile(file2);
    }).toString(), { isFunction: true }, file).catch(() => {
    });
  }
  async setPaused(paused) {
    await this._page.mainFrame().evaluateExpression(((paused2) => {
      window.playwrightSetPaused(paused2);
    }).toString(), { isFunction: true }, paused).catch(() => {
    });
  }
  async setSources(sources, primaryPageURL) {
    await this._page.mainFrame().evaluateExpression((({ sources: sources2, primaryPageURL: primaryPageURL2 }) => {
      window.playwrightSetSources(sources2, primaryPageURL2);
    }).toString(), { isFunction: true }, { sources, primaryPageURL }).catch(() => {
    });
    if (process.env.PWTEST_CLI_IS_UNDER_TEST && sources.length) {
      if (process._didSetSourcesForTest(sources[0].text))
        this.close();
    }
  }
  async setActions(actions, sources) {
  }
  async elementPicked(elementInfo, userGesture) {
    if (userGesture)
      this._page.bringToFront();
    await this._page.mainFrame().evaluateExpression(((param) => {
      window.playwrightElementPicked(param.elementInfo, param.userGesture);
    }).toString(), { isFunction: true }, { elementInfo, userGesture }).catch(() => {
    });
  }
  async updateCallLogs(callLogs) {
    await this._page.mainFrame().evaluateExpression(((callLogs2) => {
      window.playwrightUpdateLogs(callLogs2);
    }).toString(), { isFunction: true }, callLogs).catch(() => {
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EmptyRecorderApp,
  RecorderApp
});

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
var browserType_exports = {};
__export(browserType_exports, {
  BrowserReadyState: () => BrowserReadyState,
  BrowserType: () => BrowserType,
  kNoXServerRunningError: () => kNoXServerRunningError
});
module.exports = __toCommonJS(browserType_exports);
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_browserContext = require("./browserContext");
var import_timeoutSettings = require("./timeoutSettings");
var import_debug = require("./utils/debug");
var import_assert = require("../utils/isomorphic/assert");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
var import_fileUtils = require("./utils/fileUtils");
var import_helper = require("./helper");
var import_instrumentation = require("./instrumentation");
var import_pipeTransport = require("./pipeTransport");
var import_processLauncher = require("./utils/processLauncher");
var import_progress = require("./progress");
var import_protocolError = require("./protocolError");
var import_registry = require("./registry");
var import_socksClientCertificatesInterceptor = require("./socksClientCertificatesInterceptor");
var import_transport = require("./transport");
var import_debugLogger = require("./utils/debugLogger");
const kNoXServerRunningError = "Looks like you launched a headed browser without having a XServer running.\nSet either 'headless: true' or use 'xvfb-run <your-playwright-app>' before running Playwright.\n\n<3 Playwright Team";
class BrowserReadyState {
  constructor() {
    this._wsEndpoint = new import_manualPromise.ManualPromise();
  }
  onBrowserExit() {
    this._wsEndpoint.resolve(void 0);
  }
  async waitUntilReady() {
    const wsEndpoint = await this._wsEndpoint;
    return { wsEndpoint };
  }
}
class BrowserType extends import_instrumentation.SdkObject {
  constructor(parent, browserName) {
    super(parent, "browser-type");
    this._useBidi = false;
    this.attribution.browserType = this;
    this._name = browserName;
  }
  executablePath() {
    return import_registry.registry.findExecutable(this._name).executablePath(this.attribution.playwright.options.sdkLanguage) || "";
  }
  name() {
    return this._name;
  }
  async launch(metadata, options, protocolLogger) {
    options = this._validateLaunchOptions(options);
    if (this._useBidi)
      options.useWebSocket = true;
    const controller = new import_progress.ProgressController(metadata, this);
    controller.setLogName("browser");
    const browser = await controller.run((progress) => {
      const seleniumHubUrl = options.__testHookSeleniumRemoteURL || process.env.SELENIUM_REMOTE_URL;
      if (seleniumHubUrl)
        return this._launchWithSeleniumHub(progress, seleniumHubUrl, options);
      return this._innerLaunchWithRetries(progress, options, void 0, import_helper.helper.debugProtocolLogger(protocolLogger)).catch((e) => {
        throw this._rewriteStartupLog(e);
      });
    }, import_timeoutSettings.TimeoutSettings.launchTimeout(options));
    return browser;
  }
  async launchPersistentContext(metadata, userDataDir, options) {
    const launchOptions = this._validateLaunchOptions(options);
    if (this._useBidi)
      launchOptions.useWebSocket = true;
    const controller = new import_progress.ProgressController(metadata, this);
    controller.setLogName("browser");
    const browser = await controller.run(async (progress) => {
      let clientCertificatesProxy;
      if (options.clientCertificates?.length) {
        clientCertificatesProxy = new import_socksClientCertificatesInterceptor.ClientCertificatesProxy(options);
        launchOptions.proxyOverride = await clientCertificatesProxy?.listen();
        options = { ...options };
        options.internalIgnoreHTTPSErrors = true;
      }
      progress.cleanupWhenAborted(() => clientCertificatesProxy?.close());
      const browser2 = await this._innerLaunchWithRetries(progress, launchOptions, options, import_helper.helper.debugProtocolLogger(), userDataDir).catch((e) => {
        throw this._rewriteStartupLog(e);
      });
      browser2._defaultContext._clientCertificatesProxy = clientCertificatesProxy;
      return browser2;
    }, import_timeoutSettings.TimeoutSettings.launchTimeout(launchOptions));
    return browser._defaultContext;
  }
  async _innerLaunchWithRetries(progress, options, persistent, protocolLogger, userDataDir) {
    try {
      return await this._innerLaunch(progress, options, persistent, protocolLogger, userDataDir);
    } catch (error) {
      const errorMessage = typeof error === "object" && typeof error.message === "string" ? error.message : "";
      if (errorMessage.includes("Inconsistency detected by ld.so")) {
        progress.log(`<restarting browser due to hitting race condition in glibc>`);
        return this._innerLaunch(progress, options, persistent, protocolLogger, userDataDir);
      }
      throw error;
    }
  }
  async _innerLaunch(progress, options, persistent, protocolLogger, maybeUserDataDir) {
    options.proxy = options.proxy ? (0, import_browserContext.normalizeProxySettings)(options.proxy) : void 0;
    const browserLogsCollector = new import_debugLogger.RecentLogsCollector();
    const { browserProcess, userDataDir, artifactsDir, transport } = await this._launchProcess(progress, options, !!persistent, browserLogsCollector, maybeUserDataDir);
    if (options.__testHookBeforeCreateBrowser)
      await options.__testHookBeforeCreateBrowser();
    const browserOptions = {
      name: this._name,
      isChromium: this._name === "chromium",
      channel: options.channel,
      slowMo: options.slowMo,
      persistent,
      headful: !options.headless,
      artifactsDir,
      downloadsPath: options.downloadsPath || artifactsDir,
      tracesDir: options.tracesDir || artifactsDir,
      browserProcess,
      customExecutablePath: options.executablePath,
      proxy: options.proxy,
      protocolLogger,
      browserLogsCollector,
      wsEndpoint: options.useWebSocket ? transport.wsEndpoint : void 0,
      originalLaunchOptions: options
    };
    if (persistent)
      (0, import_browserContext.validateBrowserContextOptions)(persistent, browserOptions);
    copyTestHooks(options, browserOptions);
    const browser = await this.connectToTransport(transport, browserOptions);
    browser._userDataDirForTest = userDataDir;
    if (persistent && !options.ignoreAllDefaultArgs)
      await browser._defaultContext._loadDefaultContext(progress);
    return browser;
  }
  async _launchProcess(progress, options, isPersistent, browserLogsCollector, userDataDir) {
    const {
      ignoreDefaultArgs,
      ignoreAllDefaultArgs,
      args = [],
      executablePath = null,
      handleSIGINT = true,
      handleSIGTERM = true,
      handleSIGHUP = true
    } = options;
    const env = options.env ? (0, import_processLauncher.envArrayToObject)(options.env) : process.env;
    await this._createArtifactDirs(options);
    const tempDirectories = [];
    const artifactsDir = await import_fs.default.promises.mkdtemp(import_path.default.join(import_os.default.tmpdir(), "playwright-artifacts-"));
    tempDirectories.push(artifactsDir);
    if (userDataDir) {
      (0, import_assert.assert)(import_path.default.isAbsolute(userDataDir), "userDataDir must be an absolute path");
      if (!await (0, import_fileUtils.existsAsync)(userDataDir))
        await import_fs.default.promises.mkdir(userDataDir, { recursive: true, mode: 448 });
    } else {
      userDataDir = await import_fs.default.promises.mkdtemp(import_path.default.join(import_os.default.tmpdir(), `playwright_${this._name}dev_profile-`));
      tempDirectories.push(userDataDir);
    }
    await this.prepareUserDataDir(options, userDataDir);
    const browserArguments = [];
    if (ignoreAllDefaultArgs)
      browserArguments.push(...args);
    else if (ignoreDefaultArgs)
      browserArguments.push(...this.defaultArgs(options, isPersistent, userDataDir).filter((arg) => ignoreDefaultArgs.indexOf(arg) === -1));
    else
      browserArguments.push(...this.defaultArgs(options, isPersistent, userDataDir));
    let executable;
    if (executablePath) {
      if (!await (0, import_fileUtils.existsAsync)(executablePath))
        throw new Error(`Failed to launch ${this._name} because executable doesn't exist at ${executablePath}`);
      executable = executablePath;
    } else {
      const registryExecutable = import_registry.registry.findExecutable(this.getExecutableName(options));
      if (!registryExecutable || registryExecutable.browserName !== this._name)
        throw new Error(`Unsupported ${this._name} channel "${options.channel}"`);
      executable = registryExecutable.executablePathOrDie(this.attribution.playwright.options.sdkLanguage);
      await import_registry.registry.validateHostRequirementsForExecutablesIfNeeded([registryExecutable], this.attribution.playwright.options.sdkLanguage);
    }
    const readyState = this.readyState(options);
    let transport = void 0;
    let browserProcess = void 0;
    const { launchedProcess, gracefullyClose, kill } = await (0, import_processLauncher.launchProcess)({
      command: executable,
      args: browserArguments,
      env: this.amendEnvironment(env, userDataDir, executable, browserArguments),
      handleSIGINT,
      handleSIGTERM,
      handleSIGHUP,
      log: (message) => {
        readyState?.onBrowserOutput(message);
        progress.log(message);
        browserLogsCollector.log(message);
      },
      stdio: "pipe",
      tempDirectories,
      attemptToGracefullyClose: async () => {
        if (options.__testHookGracefullyClose)
          await options.__testHookGracefullyClose();
        this.attemptToGracefullyCloseBrowser(transport);
      },
      onExit: (exitCode, signal) => {
        readyState?.onBrowserExit();
        if (browserProcess && browserProcess.onclose)
          browserProcess.onclose(exitCode, signal);
      }
    });
    async function closeOrKill(timeout) {
      let timer;
      try {
        await Promise.race([
          gracefullyClose(),
          new Promise((resolve, reject) => timer = setTimeout(reject, timeout))
        ]);
      } catch (ignored) {
        await kill().catch((ignored2) => {
        });
      } finally {
        clearTimeout(timer);
      }
    }
    browserProcess = {
      onclose: void 0,
      process: launchedProcess,
      close: () => closeOrKill(options.__testHookBrowserCloseTimeout || import_timeoutSettings.DEFAULT_TIMEOUT),
      kill
    };
    progress.cleanupWhenAborted(() => closeOrKill(progress.timeUntilDeadline()));
    const wsEndpoint = (await readyState?.waitUntilReady())?.wsEndpoint;
    if (options.useWebSocket) {
      transport = await import_transport.WebSocketTransport.connect(progress, wsEndpoint);
    } else {
      const stdio = launchedProcess.stdio;
      transport = new import_pipeTransport.PipeTransport(stdio[3], stdio[4]);
    }
    return { browserProcess, artifactsDir, userDataDir, transport };
  }
  async _createArtifactDirs(options) {
    if (options.downloadsPath)
      await import_fs.default.promises.mkdir(options.downloadsPath, { recursive: true });
    if (options.tracesDir)
      await import_fs.default.promises.mkdir(options.tracesDir, { recursive: true });
  }
  async connectOverCDP(metadata, endpointURL, options) {
    throw new Error("CDP connections are only supported by Chromium");
  }
  async _launchWithSeleniumHub(progress, hubUrl, options) {
    throw new Error("Connecting to SELENIUM_REMOTE_URL is only supported by Chromium");
  }
  _validateLaunchOptions(options) {
    const { devtools = false } = options;
    let { headless = !devtools, downloadsPath, proxy } = options;
    if ((0, import_debug.debugMode)())
      headless = false;
    if (downloadsPath && !import_path.default.isAbsolute(downloadsPath))
      downloadsPath = import_path.default.join(process.cwd(), downloadsPath);
    if (this.attribution.playwright.options.socksProxyPort)
      proxy = { server: `socks5://127.0.0.1:${this.attribution.playwright.options.socksProxyPort}` };
    return { ...options, devtools, headless, downloadsPath, proxy };
  }
  _createUserDataDirArgMisuseError(userDataDirArg) {
    switch (this.attribution.playwright.options.sdkLanguage) {
      case "java":
        return new Error(`Pass userDataDir parameter to 'BrowserType.launchPersistentContext(userDataDir, options)' instead of specifying '${userDataDirArg}' argument`);
      case "python":
        return new Error(`Pass user_data_dir parameter to 'browser_type.launch_persistent_context(user_data_dir, **kwargs)' instead of specifying '${userDataDirArg}' argument`);
      case "csharp":
        return new Error(`Pass userDataDir parameter to 'BrowserType.LaunchPersistentContextAsync(userDataDir, options)' instead of specifying '${userDataDirArg}' argument`);
      default:
        return new Error(`Pass userDataDir parameter to 'browserType.launchPersistentContext(userDataDir, options)' instead of specifying '${userDataDirArg}' argument`);
    }
  }
  _rewriteStartupLog(error) {
    if (!(0, import_protocolError.isProtocolError)(error))
      return error;
    return this.doRewriteStartupLog(error);
  }
  readyState(options) {
    return void 0;
  }
  async prepareUserDataDir(options, userDataDir) {
  }
  getExecutableName(options) {
    return options.channel || this._name;
  }
}
function copyTestHooks(from, to) {
  for (const [key, value] of Object.entries(from)) {
    if (key.startsWith("__testHook"))
      to[key] = value;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowserReadyState,
  BrowserType,
  kNoXServerRunningError
});

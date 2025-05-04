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
var recorderUtils_exports = {};
__export(recorderUtils_exports, {
  buildFullSelector: () => buildFullSelector,
  collapseActions: () => collapseActions,
  frameForAction: () => frameForAction,
  mainFrameForAction: () => mainFrameForAction,
  metadataToCallLog: () => metadataToCallLog
});
module.exports = __toCommonJS(recorderUtils_exports);
function buildFullSelector(framePath, selector) {
  return [...framePath, selector].join(" >> internal:control=enter-frame >> ");
}
function metadataToCallLog(metadata, status) {
  let title = metadata.apiName || metadata.method;
  if (metadata.method === "waitForEventInfo")
    title += `(${metadata.params.info.event})`;
  title = title.replace("object.expect", "expect");
  if (metadata.error)
    status = "error";
  const params = {
    url: metadata.params?.url,
    selector: metadata.params?.selector
  };
  let duration = metadata.endTime ? metadata.endTime - metadata.startTime : void 0;
  if (typeof duration === "number" && metadata.pauseStartTime && metadata.pauseEndTime) {
    duration -= metadata.pauseEndTime - metadata.pauseStartTime;
    duration = Math.max(duration, 0);
  }
  const callLog = {
    id: metadata.id,
    messages: metadata.log,
    title,
    status,
    error: metadata.error?.error?.message,
    params,
    duration
  };
  return callLog;
}
function mainFrameForAction(pageAliases, actionInContext) {
  const pageAlias = actionInContext.frame.pageAlias;
  const page = [...pageAliases.entries()].find(([, alias]) => pageAlias === alias)?.[0];
  if (!page)
    throw new Error(`Internal error: page ${pageAlias} not found in [${[...pageAliases.values()]}]`);
  return page.mainFrame();
}
async function frameForAction(pageAliases, actionInContext, action) {
  const pageAlias = actionInContext.frame.pageAlias;
  const page = [...pageAliases.entries()].find(([, alias]) => pageAlias === alias)?.[0];
  if (!page)
    throw new Error("Internal error: page not found");
  const fullSelector = buildFullSelector(actionInContext.frame.framePath, action.selector);
  const result = await page.mainFrame().selectors.resolveFrameForSelector(fullSelector);
  if (!result)
    throw new Error("Internal error: frame not found");
  return result.frame;
}
function collapseActions(actions) {
  const result = [];
  for (const action of actions) {
    const lastAction = result[result.length - 1];
    const isSameAction = lastAction && lastAction.action.name === action.action.name && lastAction.frame.pageAlias === action.frame.pageAlias && lastAction.frame.framePath.join("|") === action.frame.framePath.join("|");
    const isSameSelector = lastAction && "selector" in lastAction.action && "selector" in action.action && action.action.selector === lastAction.action.selector;
    const shouldMerge = isSameAction && (action.action.name === "navigate" || action.action.name === "fill" && isSameSelector);
    if (!shouldMerge) {
      result.push(action);
      continue;
    }
    const startTime = result[result.length - 1].startTime;
    result[result.length - 1] = action;
    result[result.length - 1].startTime = startTime;
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildFullSelector,
  collapseActions,
  frameForAction,
  mainFrameForAction,
  metadataToCallLog
});

"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return function changeApprovalMode(threadID, approvalMode, callback) {
    if (utils.getType(threadID) !== "String") {
      throw new utils.CustomError({ error: "changeApprovalMode: threadID must be a string" });
    }

    let resolveFunc = function () { };
    let rejectFunc = function () { };
    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err) {
        if (err) return rejectFunc(err);
        resolveFunc();
      };
    }

    approvalMode = parseInt(approvalMode);
    if (approvalMode !== 0 && approvalMode !== 1) {
      throw new utils.CustomError({ error: "changeApprovalMode: approvalMode must be 0 or 1" });
    }

    const form = {
      thread_fbid: threadID,
      set_mode: approvalMode,
    };

    defaultFuncs
      .post("https://www.facebook.com/messaging/set_approval_mode/?dpr=1", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function (resData) {
        if (resData.error) {
          switch (resData.error) {
            case 1357031:
              throw new utils.CustomError({ error: "changeApprovalMode: this thread is not a group chat or you are not an admin.", rawResponse: resData });
            default:
              throw new utils.CustomError({ error: "changeApprovalMode: unknown error.", rawResponse: resData });
          }
        }
        return callback();
      })
      .catch(function (err) {
        log.error("changeApprovalMode", err);
        return callback(err);
      });

    return returnPromise;
  };
};

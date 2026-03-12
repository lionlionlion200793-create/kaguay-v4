"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
        return function changeNickname(nickname, threadID, participantID, callback) {
                let resolveFunc = function () { };
                let rejectFunc = function () { };
                const returnPromise = new Promise(function (resolve, reject) {
                        resolveFunc = resolve;
                        rejectFunc = reject;
                });
                if (!callback) {
                        callback = function (err) {
                                if (err) {
                                        return rejectFunc(err);
                                }
                                resolveFunc();
                        };
                }

                const form = {
                        dpr: 1,
                        queries: JSON.stringify({
                                o0: {
                                        doc_id: "2688826174711796",
                                        query_params: {
                                                data: {
                                                        actor_id: ctx.i_userID || ctx.userID,
                                                        client_mutation_id: "0",
                                                        nickname: nickname || "",
                                                        participant_id: participantID,
                                                        thread_id: threadID
                                                }
                                        }
                                }
                        })
                };

                defaultFuncs
                        .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
                        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
                        .then(function (resData) {
                                if (resData[resData.length - 1].error_results > 0) {
                                        throw new utils.CustomError(resData[0].o0.errors);
                                }
                                return callback();
                        })
                        .catch(function (err) {
                                log.error("changeNickname", err);
                                return callback(err);
                        });

                return returnPromise;
        };
};

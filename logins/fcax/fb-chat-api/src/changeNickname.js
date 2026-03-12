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

                const messageAndOTID = utils.generateOfflineThreadingID();
                const actorID = ctx.i_userID || ctx.userID;
                const mercuryForm = {
                        client: "mercury",
                        action_type: "ma-type:log-message",
                        author: "fbid:" + actorID,
                        author_email: "",
                        coordinates: "",
                        timestamp: Date.now(),
                        timestamp_absolute: "Today",
                        timestamp_relative: utils.generateTimestampRelative(),
                        timestamp_time_passed: "0",
                        is_unread: false,
                        is_cleared: false,
                        is_forward: false,
                        is_filtered_content: false,
                        is_spoof_warning: false,
                        source: "source:chat:web",
                        "source_tags[0]": "source:chat",
                        status: "0",
                        offline_threading_id: messageAndOTID,
                        message_id: messageAndOTID,
                        threading_id: utils.generateThreadingID(ctx.clientID),
                        manual_retry_cnt: "0",
                        thread_fbid: threadID,
                        participant_id: participantID,
                        nickname: nickname || "",
                        log_message_type: "log:user-nickname"
                };

                const attempts = [
                        // 1) set_thread_nickname (analogy to set_thread_name which works)
                        {
                                url: "https://www.facebook.com/messaging/set_thread_nickname/",
                                form: mercuryForm
                        },
                        // 2) save_thread_nickname with correct query params (used by original fca-unofficial)
                        {
                                url: "https://www.facebook.com/messaging/save_thread_nickname/?source=thread_settings&dpr=1",
                                form: {
                                        nickname: nickname || "",
                                        participant_id: participantID,
                                        thread_or_other_fbid: threadID
                                }
                        },
                        // 3) graphql single endpoint (relay modern) - same pattern as changeBio/setPostReaction
                        {
                                url: "https://www.facebook.com/api/graphql/",
                                form: {
                                        av: actorID,
                                        fb_api_caller_class: "RelayModern",
                                        fb_api_req_friendly_name: "MessengerSetNicknameMutation",
                                        doc_id: "2688826174711796",
                                        variables: JSON.stringify({
                                                input: {
                                                        actor_id: actorID,
                                                        client_mutation_id: Math.round(Math.random() * 1024).toString(),
                                                        nickname: nickname || "",
                                                        participant_id: participantID,
                                                        thread_id: threadID
                                                }
                                        })
                                }
                        },
                        // 4) graphqlbatch with av field (as used in listenMqtt.js)
                        {
                                url: "https://www.facebook.com/api/graphqlbatch/",
                                form: {
                                        av: actorID,
                                        dpr: 1,
                                        queries: JSON.stringify({
                                                o0: {
                                                        doc_id: "2688826174711796",
                                                        query_params: {
                                                                data: {
                                                                        actor_id: actorID,
                                                                        client_mutation_id: "0",
                                                                        nickname: nickname || "",
                                                                        participant_id: participantID,
                                                                        thread_id: threadID
                                                                }
                                                        }
                                                }
                                        })
                                }
                        }
                ];

                function tryNext(index) {
                        if (index >= attempts.length) {
                                log.error("changeNickname", "All endpoints failed.");
                                return callback({ error: "changeNickname: all endpoints failed" });
                        }

                        const { url, form } = attempts[index];
                        log.info("changeNickname", "[" + index + "] Trying: " + url);

                        defaultFuncs
                                .post(url, ctx.jar, form)
                                .then(function (rawRes) {
                                        log.info("changeNickname", "[" + index + "] HTTP " + rawRes.statusCode + " from " + url);
                                        log.info("changeNickname", "[" + index + "] Body: " + String(rawRes.body || "").slice(0, 500));

                                        if (rawRes.statusCode !== 200) {
                                                return tryNext(index + 1);
                                        }

                                        return utils.parseAndCheckLogin(ctx, defaultFuncs)(rawRes)
                                                .then(function (resData) {
                                                        log.info("changeNickname", "[" + index + "] Parsed: " + JSON.stringify(resData).slice(0, 300));
                                                        if (resData && resData.error) {
                                                                return tryNext(index + 1);
                                                        }
                                                        // Check for array response (graphqlbatch)
                                                        if (Array.isArray(resData) && resData[resData.length - 1] && resData[resData.length - 1].error_results > 0) {
                                                                return tryNext(index + 1);
                                                        }
                                                        log.info("changeNickname", "SUCCESS with: " + url);
                                                        return callback();
                                                });
                                })
                                .catch(function (err) {
                                        log.warn("changeNickname", "[" + index + "] Error: " + JSON.stringify(err).slice(0, 200));
                                        return tryNext(index + 1);
                                });
                }

                tryNext(0);
                return returnPromise;
        };
};

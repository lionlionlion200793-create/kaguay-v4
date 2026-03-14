import { CommandHandler } from "../handler/handlers.js";
import { threadsController, usersController, economyControllers, expControllers } from "../database/controllers/index.js";
import { utils } from "../helper/index.js";

const createHandler = (api, event, User, Thread, Economy, Exp) => {
  const args = { api, event, Users: User, Threads: Thread, Economy, Exp };
  return new CommandHandler(args);
};

const processedMessages = new Set();

function getLibyaDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Tripoli" });
}

function trackUserMessage(threadID, senderID) {
  if (!global.client.userMsgStats) global.client.userMsgStats = new Map();
  const key = `${threadID}_${senderID}`;
  const today = getLibyaDate();
  const current = global.client.userMsgStats.get(key) || { count: 0, date: today };
  if (current.date !== today) {
    current.count = 0;
    current.date = today;
  }
  current.count += 1;
  global.client.userMsgStats.set(key, current);
}

const listen = async ({ api, event }) => {
  try {
    const { threadID, senderID, type, userID, from, isGroup } = event;

    if (event.messageID && (type === "message" || type === "message_reply")) {
      if (processedMessages.has(event.messageID)) return;
      processedMessages.add(event.messageID);
      setTimeout(() => processedMessages.delete(event.messageID), 10000);
    }

    const Thread = threadsController({ api });
    const User = usersController({ api });
    const Economy = economyControllers({ api, event });
    const Exp = expControllers({ api, event });

    if (["message", "message_reply", "message_reaction", "typ"].includes(type)) {
      if (isGroup) {
        await Thread.create(threadID);
        if (type === "message" || type === "message_reply") {
          if (!global.client.messageStats) global.client.messageStats = new Map();
          const prev = global.client.messageStats.get(threadID) || 0;
          global.client.messageStats.set(threadID, prev + 1);

          const uid = senderID || userID || from;
          if (uid) trackUserMessage(threadID, uid);
        }
      }
      await User.create(senderID || userID || from);
    }

    global.kaguya = utils({ api, event });

    if (type === "message_reply" && event.messageReply) {
      if (!global.client.devMessages) global.client.devMessages = new Map();
      const devMsg = global.client.devMessages.get(event.messageReply.messageID);
      if (devMsg) {
        const ownerID = global.client.config.ADMIN_IDS[0];
        try {
          let senderName = senderID;
          try {
            const info = await api.getUserInfo(senderID);
            senderName = info?.[senderID]?.name || senderID;
          } catch (_) {}
          await api.sendMessage(
            `📩 | رد جديد على رسالتك!\n\n👤 الاسم: ${senderName}\n🆔 fb.com/${senderID}\n🏷️ القروب: ${devMsg.groupName}\n\n💬 الرد:\n${event.body || "—"}`,
            ownerID
          );
        } catch (err) {
          console.error("[DevReply] فشل إرسال الرد للمطور:", err.message);
        }
      }
    }

    const handler = createHandler(api, event, User, Thread, Economy, Exp);
    await handler.handleEvent();

    switch (type) {
      case "message":
        await handler.handleCommand();
        break;
      case "message_reaction":
        await handler.handleReaction();
        break;
      case "message_reply":
        await handler.handleReply();
        await handler.handleCommand();
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Error during event handling:", error);
  }
};

export { listen };

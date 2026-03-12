import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUTE_FILE = path.join(__dirname, "../../cache/data/mutedThreads.json");

export function loadMuteData() {
  try {
    if (!fs.existsSync(MUTE_FILE)) return {};
    return JSON.parse(fs.readFileSync(MUTE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function saveMuteData(data) {
  try {
    fs.mkdirSync(path.dirname(MUTE_FILE), { recursive: true });
    fs.writeFileSync(MUTE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

class Mute {
  constructor() {
    this.name = "ممنوع";
    this.author = "Kaguya Project";
    this.cooldowns = 3;
    this.description = "تفعيل وضع الصمت - يتم طرد أي شخص يرسل دون إذن";
    this.role = "admin";
    this.aliases = ["مسموح"];
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply, mentions } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    const config = global.client?.config || {};
    const prefix = config.prefix || "*";
    const botID = String(api.getCurrentUserID());
    const isOwner = (config.ADMIN_IDS || []).includes(String(senderID));

    const threadInfo = await api.getThreadInfo(threadID);
    const threadAdmins = (threadInfo.adminIDs || []).map(a => String(a.uid || a));
    const isAdmin = threadAdmins.includes(String(senderID)) || isOwner;

    if (!isAdmin) {
      return api.sendMessage("🚫 | ليس لديك صلاحية استخدام هذا الأمر.", threadID, messageID);
    }

    const muteData = loadMuteData();
    const tid = String(threadID);

    const body = (event.body || "").trim();
    const bodyWithoutPrefix = body.startsWith(prefix) ? body.slice(prefix.length).trim() : body;
    const firstWord = bodyWithoutPrefix.split(/\s+/)[0];
    const isMuteCommand = firstWord === "ممنوع";
    const isAllowCommand = firstWord === "مسموح";
    const fullArgs = args.join(" ").trim();

    if (isMuteCommand) {
      if (muteData[tid]?.active) {
        const allowedList = muteData[tid].allowedIDs || [];
        return api.sendMessage(
          `🔇 | وضع الصمت مفعّل مسبقاً.\n` +
          `👤 المسموح لهم: ${allowedList.length} شخص`,
          threadID, messageID
        );
      }

      muteData[tid] = {
        active: true,
        allowedIDs: [String(senderID), botID],
        kickedUsers: {},
      };
      saveMuteData(muteData);

      return api.sendMessage(
        "🔇 | تم تفعيل وضع الصمت!\n" +
        "━━━━━━━━━━━━━━━━━━━━━━\n" +
        "⚠️ أي شخص يرسل رسالة سيتم طرده فوراً!\n\n" +
        `💡 لإضافة شخص مسموح:\n` +
        `   رد على رسالته + ${prefix}مسموح\n` +
        `   تاغ الشخص + ${prefix}مسموح\n` +
        `   ${prefix}مسموح [الآيدي]\n\n` +
        `🔊 لإلغاء الصمت: ${prefix}مسموح الكل`,
        threadID, messageID
      );
    }

    if (isAllowCommand) {
      if (fullArgs === "الكل") {
        if (!muteData[tid]?.active) {
          return api.sendMessage("❌ | وضع الصمت غير مفعّل في هذا القروب.", threadID, messageID);
        }
        delete muteData[tid];
        saveMuteData(muteData);
        return api.sendMessage(
          "🔊 | تم إلغاء وضع الصمت!\n" +
          "━━━━━━━━━━━━━━━━━━━━━━\n" +
          "✅ الكل مسموح له الكلام الآن.",
          threadID, messageID
        );
      }

      if (!muteData[tid]?.active) {
        return api.sendMessage("❌ | وضع الصمت غير مفعّل في هذا القروب.", threadID, messageID);
      }

      let targetID = null;
      let targetName = null;

      if (messageReply) {
        targetID = String(messageReply.senderID);
      } else if (mentions && Object.keys(mentions).length > 0) {
        targetID = String(Object.keys(mentions)[0]);
      } else if (/^\d+$/.test(fullArgs)) {
        targetID = fullArgs;
      }

      if (!targetID) {
        return api.sendMessage(
          "❌ | حدد الشخص المسموح له:\n\n" +
          `📌 رد على رسالته + ${prefix}مسموح\n` +
          `📌 تاغ الشخص + ${prefix}مسموح\n` +
          `📌 ${prefix}مسموح [الآيدي]\n` +
          `📌 ${prefix}مسموح الكل ← إلغاء الصمت`,
          threadID, messageID
        );
      }

      try {
        const userInfo = await api.getUserInfo(targetID);
        targetName = userInfo?.[targetID]?.name || targetID;
      } catch {
        targetName = targetID;
      }

      if (!muteData[tid].allowedIDs.includes(targetID)) {
        muteData[tid].allowedIDs.push(targetID);
      }

      const wasKicked = muteData[tid].kickedUsers?.[targetID];

      if (wasKicked) {
        delete muteData[tid].kickedUsers[targetID];
        saveMuteData(muteData);
        try {
          await api.addUserToGroup(targetID, threadID);
          return api.sendMessage(
            `✅ | تم السماح لـ 『${targetName}』 وإعادة إضافته للقروب.`,
            threadID, messageID
          );
        } catch {
          saveMuteData(muteData);
          return api.sendMessage(
            `✅ | تم السماح لـ 『${targetName}』 بالكلام.\n` +
            `⚠️ | فشلت إعادة إضافته، أضفه يدوياً.`,
            threadID, messageID
          );
        }
      }

      saveMuteData(muteData);
      return api.sendMessage(
        `✅ | تم السماح لـ 『${targetName}』 بالكلام في القروب.`,
        threadID, messageID
      );
    }
  }
}

export default new Mute();

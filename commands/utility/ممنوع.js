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
    this.description = "تعليق القروب - يتعذر الإرسال على الجميع إلا المسموح لهم";
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
        return api.sendMessage(
          `🔇 | وضع الصمت مفعّل مسبقاً.\n👤 المسموح لهم: ${(muteData[tid].allowedIDs || []).length} شخص`,
          threadID, messageID
        );
      }

      try {
        await api.changeApprovalMode(tid, 1);
      } catch (err) {
        console.error("[ممنوع] changeApprovalMode error:", err?.message || err);
      }

      muteData[tid] = {
        active: true,
        allowedIDs: [String(senderID), botID],
        elevatedAdmins: [],
        kickedUsers: {},
      };
      saveMuteData(muteData);

      return api.sendMessage(
        "🔇 | تم تعليق القروب!\n" +
        "━━━━━━━━━━━━━━━━━━━━━━\n" +
        "⛔ يتعذر على الجميع الإرسال الآن!\n\n" +
        `💡 للسماح لشخص بالكلام:\n` +
        `   رد على رسالته + ${prefix}مسموح\n` +
        `   تاغ الشخص + ${prefix}مسموح\n` +
        `   ${prefix}مسموح [الآيدي]\n\n` +
        `🔊 لرفع التعليق: ${prefix}مسموح الكل`,
        threadID, messageID
      );
    }

    if (isAllowCommand) {
      if (fullArgs === "الكل") {
        if (!muteData[tid]?.active) {
          return api.sendMessage("❌ | وضع الصمت غير مفعّل في هذا القروب.", threadID, messageID);
        }

        try {
          await api.changeApprovalMode(tid, 0);
        } catch (err) {
          console.error("[مسموح] changeApprovalMode error:", err?.message || err);
        }

        const elevated = muteData[tid].elevatedAdmins || [];
        for (const uid of elevated) {
          try {
            await api.changeAdminStatus(tid, [uid], false);
          } catch {}
        }

        delete muteData[tid];
        saveMuteData(muteData);

        return api.sendMessage(
          "🔊 | تم رفع التعليق عن القروب!\n" +
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
          `📌 ${prefix}مسموح الكل ← رفع التعليق`,
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
        try {
          await api.addUserToGroup(targetID, threadID);
        } catch {}
      }

      const alreadyAdmin = threadAdmins.includes(targetID);
      if (!alreadyAdmin) {
        try {
          await api.changeAdminStatus(tid, [targetID], true);
          if (!muteData[tid].elevatedAdmins) muteData[tid].elevatedAdmins = [];
          if (!muteData[tid].elevatedAdmins.includes(targetID)) {
            muteData[tid].elevatedAdmins.push(targetID);
          }
        } catch (err) {
          console.error("[مسموح] changeAdminStatus error:", err?.message || err);
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

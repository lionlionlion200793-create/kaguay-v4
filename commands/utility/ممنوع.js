import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUTE_FILE = path.join(__dirname, "../../cache/data/mutedThreads.json");

function loadMuteData() {
  try {
    if (!fs.existsSync(MUTE_FILE)) return {};
    return JSON.parse(fs.readFileSync(MUTE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveMuteData(data) {
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
    this.description = "تفعيل وضع الصمت في القروب - لا أحد يتكلم إلا المسموح لهم";
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
    const isOwner = config.ADMIN_IDS?.includes(String(senderID));

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
    const firstWord = bodyWithoutPrefix.split(/\s+/)[0].toLowerCase();
    const isMuteCommand = firstWord === "ممنوع";
    const isAllowCommand = firstWord === "مسموح";

    const fullArgs = args.join(" ").trim();

    if (isMuteCommand) {
      if (muteData[tid]?.active) {
        return api.sendMessage("🔇 | وضع الصمت مفعّل مسبقاً في هذا القروب.", threadID, messageID);
      }

      muteData[tid] = {
        active: true,
        allowedIDs: [String(senderID), botID],
      };
      saveMuteData(muteData);

      return api.sendMessage(
        "🔇 | تم تفعيل وضع الصمت!\n" +
        "━━━━━━━━━━━━━━━━\n" +
        "❌ لا أحد يستطيع الإرسال الآن إلا أنت.\n\n" +
        "💡 لإضافة شخص:\n" +
        `  • رد على رسالته ثم أكتب ${prefix}مسموح\n` +
        `  • تاج الشخص + ${prefix}مسموح\n` +
        `  • ${prefix}مسموح [الآيدي]\n\n` +
        `💡 لإلغاء الصمت: ${prefix}مسموح الكل`,
        threadID, messageID
      );
    }

    if (isAllowCommand) {
      if (!muteData[tid]?.active) {
        return api.sendMessage("❌ | وضع الصمت غير مفعّل في هذا القروب.", threadID, messageID);
      }

      if (fullArgs === "" || fullArgs === "الكل") {
        delete muteData[tid];
        saveMuteData(muteData);
        return api.sendMessage(
          "🔊 | تم إلغاء وضع الصمت!\n" +
          "━━━━━━━━━━━━━━━━\n" +
          "✅ الكل مسموح له الكلام الآن.",
          threadID, messageID
        );
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
          "❌ | يرجى تحديد الشخص المسموح له بإحدى الطرق:\n" +
          `📌 رد على رسالته + ${prefix}مسموح\n` +
          `📌 تاج الشخص + ${prefix}مسموح\n` +
          `📌 ${prefix}مسموح [الآيدي]\n` +
          `📌 ${prefix}مسموح الكل ← لإلغاء الصمت بالكامل`,
          threadID, messageID
        );
      }

      if (!muteData[tid].allowedIDs.includes(targetID)) {
        muteData[tid].allowedIDs.push(targetID);
        saveMuteData(muteData);
      }

      try {
        const userInfo = await api.getUserInfo(targetID);
        targetName = userInfo?.[targetID]?.name || targetID;
      } catch {
        targetName = targetID;
      }

      return api.sendMessage(
        `✅ | تم السماح لـ『${targetName}』بالكلام في القروب.`,
        threadID, messageID
      );
    }
  }
}

export default new Mute();

import fs from "fs-extra";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = "./database/saved.json";
const imgDir = path.join(__dirname, "../../temp/saved");

function readDB() {
  try {
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    if (Array.isArray(data)) return {};
    return data;
  } catch {
    return {};
  }
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function helpMessage() {
  return (
    `📦 نظام المستودعات\n\n` +
    `📌 إنشاء مستودع:\n  *حفظ مستودع [اسم]\n  مثال: *حفظ مستودع قوانين-المافيا\n\n` +
    `📌 حفظ نص أو صورة في مستودع:\n  رد على الرسالة + *حفظ [اسم-المستودع] [اسم العنصر]\n  مثال: *حفظ قوانين-المافيا رتب اقليم المافيا\n\n` +
    `📌 عرض المستودعات:\n  *حفظ مستودعاتي\n\n` +
    `💡 اسم المستودع كلمة واحدة (استخدم - للفراغات)`
  );
}

class Save {
  constructor() {
    this.name = "حفظ";
    this.aliases = ["save", "احفظ"];
    this.description = "نظام المستودعات — انشئ مستودع وخزّن فيه رسائل وصور";
    this.role = "owner";
    this.cooldowns = 3;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, messageReply, senderID } = event;
    const adminIDs = global.client?.config?.ADMIN_IDS || [];
    if (!adminIDs.includes(senderID)) return;

    const db = readDB();

    if (!args || args.length === 0) {
      return api.sendMessage(helpMessage(), threadID, messageID);
    }

    const firstArg = args[0];

    if (firstArg === "مستودع" || firstArg === "انشاء" || firstArg === "create") {
      const repoName = args.slice(1).join(" ").trim();
      if (!repoName) {
        return api.sendMessage("❌ | اكتب اسم المستودع.\n📌 مثال: *حفظ مستودع قوانين-المافيا", threadID, messageID);
      }
      if (db[repoName]) {
        return api.sendMessage(`⚠️ | المستودع "${repoName}" موجود بالفعل.`, threadID, messageID);
      }
      db[repoName] = { createdAt: new Date().toISOString(), items: {} };
      writeDB(db);
      return api.sendMessage(
        `✅ | تم إنشاء المستودع: 📦 "${repoName}"\n\n💡 الآن احفظ فيه:\n  رد + *حفظ ${repoName} [اسم العنصر]`,
        threadID, messageID
      );
    }

    if (firstArg === "مستودعاتي" || firstArg === "مستودعات" || firstArg === "list") {
      const repos = Object.keys(db);
      if (repos.length === 0) {
        return api.sendMessage("📭 | لا توجد مستودعات بعد.\n📌 أنشئ واحداً: *حفظ مستودع [اسم]", threadID, messageID);
      }
      const list = repos.map((r, i) => {
        const count = Object.keys(db[r].items || {}).length;
        return `${i + 1}. 📦 ${r} — ${count} عنصر`;
      }).join("\n");
      return api.sendMessage(`📦 المستودعات (${repos.length}):\n\n${list}`, threadID, messageID);
    }

    const repoName = firstArg;
    const itemName = args.slice(1).join(" ").trim();

    if (!db[repoName]) {
      const repos = Object.keys(db);
      const suggestion = repos.length > 0
        ? `\n\n📦 مستودعاتك: ${repos.join(" | ")}`
        : "\n\n📌 أنشئ مستودعاً أولاً: *حفظ مستودع [اسم]";
      return api.sendMessage(
        `❌ | المستودع "${repoName}" غير موجود.${suggestion}`,
        threadID, messageID
      );
    }

    if (!itemName) {
      return api.sendMessage(
        `❌ | اكتب اسماً للعنصر.\n📌 مثال: *حفظ ${repoName} رتب اقليم المافيا`,
        threadID, messageID
      );
    }

    if (!messageReply) {
      return api.sendMessage(
        `❌ | رُد على الرسالة أو الصورة التي تريد حفظها.\n📌 مثال: رد + *حفظ ${repoName} ${itemName}`,
        threadID, messageID
      );
    }

    if (!db[repoName].items) db[repoName].items = {};

    const attachments = messageReply.attachments || [];
    const imageAttachment = attachments.find(
      (a) => a.type === "photo" || a.type === "sticker" || a.type === "animated_image"
    );

    if (imageAttachment) {
      const imgUrl =
        imageAttachment.url ||
        imageAttachment.previewUrl ||
        imageAttachment.largePreviewUrl;

      if (!imgUrl) {
        return api.sendMessage("❌ | تعذر الحصول على رابط الصورة.", threadID, messageID);
      }

      try {
        await fs.ensureDir(imgDir);
        const safeItem = itemName.replace(/\s+/g, "_").replace(/[^\w\u0600-\u06FF-]/g, "");
        const fileName = `${Date.now()}_${safeItem}.jpg`;
        const filePath = path.join(imgDir, fileName);

        const response = await axios.get(imgUrl, { responseType: "arraybuffer" });
        await fs.writeFile(filePath, response.data);

        db[repoName].items[itemName] = {
          type: "image",
          filePath,
          savedAt: new Date().toISOString(),
        };
        writeDB(db);

        return api.sendMessage(
          `✅ | تم حفظ الصورة في 📦 "${repoName}"\n🏷️ الاسم: "${itemName}"\n\n💡 استرجعها: *المحفوظات ${repoName} ${itemName}`,
          threadID, messageID
        );
      } catch (err) {
        console.error("[حفظ] خطأ في تنزيل الصورة:", err.message);
        return api.sendMessage("❌ | فشل في تنزيل الصورة.", threadID, messageID);
      }
    }

    const text = messageReply.body || "";
    if (!text.trim()) {
      return api.sendMessage(
        "❌ | الرسالة المردود عليها فارغة ولا تحتوي نصاً أو صورة.",
        threadID, messageID
      );
    }

    db[repoName].items[itemName] = {
      type: "text",
      content: text,
      savedAt: new Date().toISOString(),
    };
    writeDB(db);

    return api.sendMessage(
      `✅ | تم حفظ النص في 📦 "${repoName}"\n🏷️ الاسم: "${itemName}"\n\n💡 استرجعه: *المحفوظات ${repoName} ${itemName}`,
      threadID, messageID
    );
  }
}

export default new Save();

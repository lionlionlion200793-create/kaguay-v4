import fs from "fs-extra";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = "./database/saved.json";
const imgDir = path.join(__dirname, "../../temp/saved");

function readSaved() {
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  } catch {
    return {};
  }
}

function writeSaved(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

class Save {
  constructor() {
    this.name = "حفظ";
    this.aliases = ["save", "احفظ"];
    this.description = "حفظ رسالة أو صورة باسم معين لاسترجاعها لاحقاً";
    this.role = "owner";
    this.cooldowns = 3;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply) {
      return api.sendMessage(
        "❌ | رُد على الرسالة أو الصورة التي تريد حفظها.\n\n📌 مثال:\n  رد على رسالة + *حفظ رتب اقليم المافيا",
        threadID,
        messageID
      );
    }

    const name = args.join(" ").trim();
    if (!name) {
      return api.sendMessage(
        "❌ | اكتب اسماً للحفظ.\n\n📌 مثال:\n  رد على رسالة + *حفظ رتب اقليم المافيا",
        threadID,
        messageID
      );
    }

    const saved = readSaved();
    const attachments = messageReply.attachments || [];
    const imageAttachment = attachments.find(
      (a) => a.type === "photo" || a.type === "sticker" || a.type === "animated_image"
    );

    if (imageAttachment) {
      const imgUrl = imageAttachment.url || imageAttachment.previewUrl || imageAttachment.largePreviewUrl;

      if (!imgUrl) {
        return api.sendMessage("❌ | تعذر الحصول على رابط الصورة.", threadID, messageID);
      }

      try {
        await fs.ensureDir(imgDir);
        const fileName = `${Date.now()}_${name.replace(/\s+/g, "_")}.jpg`;
        const filePath = path.join(imgDir, fileName);

        const response = await axios.get(imgUrl, { responseType: "arraybuffer" });
        await fs.writeFile(filePath, response.data);

        saved[name] = {
          type: "image",
          filePath: filePath,
          savedAt: new Date().toISOString(),
        };
        writeSaved(saved);

        return api.sendMessage(
          `✅ | تم حفظ الصورة باسم: "${name}"\n\n💡 استرجعها بـ: *المحفوظات ${name}`,
          threadID,
          messageID
        );
      } catch (err) {
        console.error("[حفظ] خطأ في تنزيل الصورة:", err.message);
        return api.sendMessage("❌ | فشل في تنزيل الصورة.", threadID, messageID);
      }
    }

    const text = messageReply.body || "";
    if (!text.trim()) {
      return api.sendMessage(
        "❌ | الرسالة المردود عليها فارغة ولا تحتوي على نص أو صورة.",
        threadID,
        messageID
      );
    }

    saved[name] = {
      type: "text",
      content: text,
      savedAt: new Date().toISOString(),
    };
    writeSaved(saved);

    return api.sendMessage(
      `✅ | تم حفظ الرسالة باسم: "${name}"\n\n💡 استرجعها بـ: *المحفوظات ${name}`,
      threadID,
      messageID
    );
  }
}

export default new Save();

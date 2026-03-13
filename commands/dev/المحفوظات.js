import fs from "fs-extra";
import path from "path";

const dbPath = "./database/saved.json";

function readSaved() {
  try {
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    if (Array.isArray(data)) return {};
    return data;
  } catch {
    return {};
  }
}

function writeSaved(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

class Saved {
  constructor() {
    this.name = "المحفوظات";
    this.aliases = ["saved", "محفوظ"];
    this.description = "استرجاع رسالة أو صورة محفوظة، أو عرض قائمة المحفوظات";
    this.role = "owner";
    this.cooldowns = 3;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;
    const saved = readSaved();
    const keys = Object.keys(saved);

    if (args[0] === "حذف" || args[0] === "delete") {
      const name = args.slice(1).join(" ").trim();
      if (!name) {
        return api.sendMessage(
          "❌ | اكتب اسم المحفوظة التي تريد حذفها.\n📌 مثال: *المحفوظات حذف رتب اقليم المافيا",
          threadID,
          messageID
        );
      }
      if (!saved[name]) {
        return api.sendMessage(`❌ | لا توجد محفوظة باسم: "${name}"`, threadID, messageID);
      }

      if (saved[name].type === "image" && saved[name].filePath) {
        try { await fs.remove(saved[name].filePath); } catch {}
      }

      delete saved[name];
      writeSaved(saved);
      return api.sendMessage(`🗑️ | تم حذف المحفوظة: "${name}"`, threadID, messageID);
    }

    const name = args.join(" ").trim();

    if (!name) {
      if (keys.length === 0) {
        return api.sendMessage("📭 | لا توجد أي محفوظات حتى الآن.", threadID, messageID);
      }

      const list = keys
        .map((k, i) => `${i + 1}. ${k} [${saved[k].type === "image" ? "صورة" : "نص"}]`)
        .join("\n");

      return api.sendMessage(
        `📋 | قائمة المحفوظات (${keys.length}):\n\n${list}\n\n💡 استرجع أي واحدة بـ: *المحفوظات [الاسم]`,
        threadID,
        messageID
      );
    }

    const item = saved[name];
    if (!item) {
      return api.sendMessage(
        `❌ | لا توجد محفوظة باسم: "${name}"\n\n💡 اكتب *المحفوظات لعرض جميع المحفوظات`,
        threadID,
        messageID
      );
    }

    if (item.type === "text") {
      return api.sendMessage(item.content, threadID, messageID);
    }

    if (item.type === "image") {
      const filePath = item.filePath;
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        return api.sendMessage(
          `❌ | ملف الصورة "${name}" غير موجود. ربما تم حذفه.`,
          threadID,
          messageID
        );
      }

      return api.sendMessage(
        {
          body: `📌 ${name}`,
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        messageID
      );
    }
  }
}

export default new Saved();

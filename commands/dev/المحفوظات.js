import fs from "fs-extra";

const dbPath = "./database/saved.json";

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

class Saved {
  constructor() {
    this.name = "المحفوظات";
    this.aliases = ["saved", "محفوظ", "مستودعاتي"];
    this.description = "استعراض المستودعات وعناصرها واسترجاعها أو حذفها";
    this.role = "owner";
    this.cooldowns = 3;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    const adminIDs = global.client?.config?.ADMIN_IDS || [];
    if (!adminIDs.includes(senderID)) return;

    const db = readDB();
    const repos = Object.keys(db);

    if (!args || args.length === 0) {
      if (repos.length === 0) {
        return api.sendMessage(
          "📭 | لا توجد مستودعات بعد.\n📌 أنشئ واحداً: *حفظ مستودع [اسم]",
          threadID, messageID
        );
      }
      const list = repos.map((r, i) => {
        const count = Object.keys(db[r].items || {}).length;
        return `${i + 1}. 📦 ${r} — ${count} عنصر`;
      }).join("\n");
      return api.sendMessage(
        `📦 مستودعاتك (${repos.length}):\n\n${list}\n\n💡 لعرض محتويات مستودع:\n  *المحفوظات [اسم-المستودع]`,
        threadID, messageID
      );
    }

    const firstArg = args[0];

    if (firstArg === "حذف" || firstArg === "delete") {
      const second = args[1];
      const repoArg = args[2] ? args.slice(2).join(" ").trim() : null;

      if (second === "مستودع" && repoArg) {
        if (!db[repoArg]) {
          return api.sendMessage(`❌ | المستودع "${repoArg}" غير موجود.`, threadID, messageID);
        }
        const count = Object.keys(db[repoArg].items || {}).length;
        const items = db[repoArg].items || {};

        for (const item of Object.values(items)) {
          if (item.type === "image" && item.filePath) {
            try { await fs.remove(item.filePath); } catch {}
          }
        }

        delete db[repoArg];
        writeDB(db);
        return api.sendMessage(
          `🗑️ | تم حذف المستودع: 📦 "${repoArg}" وجميع عناصره (${count} عنصر).`,
          threadID, messageID
        );
      }

      const repoName = second;
      const itemName = args.slice(2).join(" ").trim();

      if (!repoName) {
        return api.sendMessage(
          "❌ | حدد المستودع والعنصر.\n📌 أمثلة:\n  *المحفوظات حذف مستودع [اسم]\n  *المحفوظات حذف [مستودع] [عنصر]",
          threadID, messageID
        );
      }

      if (!db[repoName]) {
        return api.sendMessage(`❌ | المستودع "${repoName}" غير موجود.`, threadID, messageID);
      }

      if (!itemName) {
        return api.sendMessage(
          `❌ | اكتب اسم العنصر.\n📌 مثال: *المحفوظات حذف ${repoName} [اسم العنصر]`,
          threadID, messageID
        );
      }

      const items = db[repoName].items || {};
      if (!items[itemName]) {
        return api.sendMessage(
          `❌ | العنصر "${itemName}" غير موجود في 📦 "${repoName}".`,
          threadID, messageID
        );
      }

      if (items[itemName].type === "image" && items[itemName].filePath) {
        try { await fs.remove(items[itemName].filePath); } catch {}
      }

      delete db[repoName].items[itemName];
      writeDB(db);
      return api.sendMessage(
        `🗑️ | تم حذف "${itemName}" من 📦 "${repoName}".`,
        threadID, messageID
      );
    }

    const repoName = firstArg;
    const itemName = args.slice(1).join(" ").trim();

    if (!db[repoName]) {
      const suggestion = repos.length > 0
        ? `\n\n📦 مستودعاتك: ${repos.join(" | ")}`
        : "\n\n📌 أنشئ مستودعاً: *حفظ مستودع [اسم]";
      return api.sendMessage(
        `❌ | المستودع "${repoName}" غير موجود.${suggestion}`,
        threadID, messageID
      );
    }

    const repoItems = db[repoName].items || {};
    const itemKeys = Object.keys(repoItems);

    if (!itemName) {
      if (itemKeys.length === 0) {
        return api.sendMessage(
          `📦 "${repoName}" فارغ حالياً.\n\n💡 أضف عنصراً: رد + *حفظ ${repoName} [اسم العنصر]`,
          threadID, messageID
        );
      }
      const list = itemKeys.map((k, i) => {
        const t = repoItems[k].type === "image" ? "🖼️" : "📝";
        return `${i + 1}. ${t} ${k}`;
      }).join("\n");

      return api.sendMessage(
        `📦 "${repoName}" — ${itemKeys.length} عنصر:\n\n${list}\n\n💡 لاسترجاع عنصر:\n  *المحفوظات ${repoName} [اسم العنصر]`,
        threadID, messageID
      );
    }

    const item = repoItems[itemName];
    if (!item) {
      const list = itemKeys.length > 0
        ? `\n\n📋 العناصر المتاحة:\n${itemKeys.map((k, i) => `${i + 1}. ${k}`).join("\n")}`
        : "";
      return api.sendMessage(
        `❌ | العنصر "${itemName}" غير موجود في 📦 "${repoName}".${list}`,
        threadID, messageID
      );
    }

    if (item.type === "text") {
      return api.sendMessage(item.content, threadID, messageID);
    }

    if (item.type === "image") {
      const exists = await fs.pathExists(item.filePath);
      if (!exists) {
        return api.sendMessage(
          `❌ | ملف الصورة "${itemName}" غير موجود. ربما تم حذفه.`,
          threadID, messageID
        );
      }
      return api.sendMessage(
        { body: `📦 ${repoName} › ${itemName}`, attachment: fs.createReadStream(item.filePath) },
        threadID, messageID
      );
    }
  }
}

export default new Saved();

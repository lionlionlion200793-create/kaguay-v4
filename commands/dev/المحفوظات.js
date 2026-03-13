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

function findItemAcrossRepos(db, itemName) {
  for (const [repoName, repo] of Object.entries(db)) {
    if (repo.items?.[itemName]) {
      return { repoName, item: repo.items[itemName] };
    }
  }
  return null;
}

class Saved {
  constructor() {
    this.name = "المحفوظات";
    this.aliases = ["saved", "محفوظ"];
    this.description = "عرض وحذف المستودعات والعناصر المحفوظة";
    this.role = "owner";
    this.cooldowns = 3;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    const adminIDs = global.client?.config?.ADMIN_IDS || [];
    if (!adminIDs.includes(senderID)) return;

    const db = readDB();

    if (!args || args.length === 0) {
      const repos = Object.keys(db);
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
        `📦 مستودعاتك (${repos.length}):\n\n${list}\n\n` +
        `📌 عرض محتويات مستودع:\n  *المحفوظات عرض مستودع [اسم]\n` +
        `📌 عرض عنصر:\n  *المحفوظات عرض [اسم العنصر]`,
        threadID, messageID
      );
    }

    const action = args[0];

    if (action === "عرض" || action === "show") {
      const second = args[1];

      if (second === "مستودع" || second === "repo") {
        const repoName = args.slice(2).join(" ").trim();
        if (!repoName) {
          return api.sendMessage("❌ | اكتب اسم المستودع.\n📌 مثال: *المحفوظات عرض مستودع بليتش", threadID, messageID);
        }
        if (!db[repoName]) {
          return api.sendMessage(`❌ | لا يوجد مستودع باسم "${repoName}".`, threadID, messageID);
        }
        const items = db[repoName].items || {};
        const keys = Object.keys(items);
        if (keys.length === 0) {
          return api.sendMessage(
            `📦 "${repoName}" فارغ.\n\n💡 أضف عنصراً: رد + *حفظ ${repoName} [اسم]`,
            threadID, messageID
          );
        }
        const list = keys.map((k, i) => {
          const t = items[k].type === "image" ? "🖼️" : "📝";
          return `${i + 1}. ${t} ${k}`;
        }).join("\n");
        return api.sendMessage(
          `📦 "${repoName}" — ${keys.length} عنصر:\n\n${list}\n\n` +
          `💡 *المحفوظات عرض [اسم العنصر] — لعرض عنصر`,
          threadID, messageID
        );
      }

      const itemName = args.slice(1).join(" ").trim();
      if (!itemName) {
        return api.sendMessage("❌ | اكتب اسم العنصر.\n📌 مثال: *المحفوظات عرض شعار المطبخ", threadID, messageID);
      }

      const found = findItemAcrossRepos(db, itemName);
      if (!found) {
        return api.sendMessage(`❌ | لا يوجد عنصر باسم "${itemName}".`, threadID, messageID);
      }

      const { item } = found;

      if (item.type === "text") {
        return api.sendMessage(item.content, threadID, messageID);
      }

      if (item.type === "image") {
        const exists = await fs.pathExists(item.filePath);
        if (!exists) {
          return api.sendMessage(`❌ | ملف "${itemName}" غير موجود.`, threadID, messageID);
        }
        return api.sendMessage(
          { body: `📌 ${itemName}`, attachment: fs.createReadStream(item.filePath) },
          threadID, messageID
        );
      }
    }

    if (action === "حذف" || action === "delete") {
      const second = args[1];

      if (second === "مستودع" || second === "repo") {
        const repoName = args.slice(2).join(" ").trim();
        if (!repoName) {
          return api.sendMessage("❌ | اكتب اسم المستودع.\n📌 مثال: *المحفوظات حذف مستودع بليتش", threadID, messageID);
        }
        if (!db[repoName]) {
          return api.sendMessage(`❌ | لا يوجد مستودع باسم "${repoName}".`, threadID, messageID);
        }
        const count = Object.keys(db[repoName].items || {}).length;
        for (const item of Object.values(db[repoName].items || {})) {
          if (item.type === "image" && item.filePath) {
            try { await fs.remove(item.filePath); } catch {}
          }
        }
        delete db[repoName];
        writeDB(db);
        return api.sendMessage(
          `🗑️ | تم حذف المستودع 📦 "${repoName}" وجميع عناصره (${count} عنصر).`,
          threadID, messageID
        );
      }

      const itemName = args.slice(1).join(" ").trim();
      if (!itemName) {
        return api.sendMessage("❌ | اكتب اسم العنصر.\n📌 مثال: *المحفوظات حذف شعار المطبخ", threadID, messageID);
      }

      const found = findItemAcrossRepos(db, itemName);
      if (!found) {
        return api.sendMessage(`❌ | لا يوجد عنصر باسم "${itemName}".`, threadID, messageID);
      }

      const { repoName, item } = found;
      if (item.type === "image" && item.filePath) {
        try { await fs.remove(item.filePath); } catch {}
      }
      delete db[repoName].items[itemName];
      writeDB(db);
      return api.sendMessage(`🗑️ | تم حذف "${itemName}" من 📦 "${repoName}".`, threadID, messageID);
    }

    return api.sendMessage(
      `📌 استخدام الأمر:\n\n` +
      `عرض مستودعاتك:\n  *المحفوظات\n\n` +
      `عرض محتويات مستودع:\n  *المحفوظات عرض مستودع [اسم]\n\n` +
      `عرض عنصر:\n  *المحفوظات عرض [اسم العنصر]\n\n` +
      `حذف مستودع:\n  *المحفوظات حذف مستودع [اسم]\n\n` +
      `حذف عنصر:\n  *المحفوظات حذف [اسم العنصر]`,
      threadID, messageID
    );
  }
}

export default new Saved();

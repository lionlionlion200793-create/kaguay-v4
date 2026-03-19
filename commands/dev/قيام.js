import fs from "fs-extra";

const filePath = "./database/restrictedCommands.json";

class EnableCommand {
  constructor() {
    this.name = "قيام";
    this.aliases = ["تفعيل-امر", "enable-cmd", "enablecmd"];
    this.description = "إعادة تفعيل أمر كان معطلاً";
    this.role = "owner";
    this.cooldowns = 0;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;
    const prefix = global.client?.config?.prefix || "*";

    const cmdName = args.join(" ").trim();

    if (!cmdName) {
      return api.sendMessage(
        `❌ | اكتب اسم الأمر الذي تريد تفعيله.\n📌 مثال: ${prefix}قيام صور`,
        threadID, messageID
      );
    }

    const command = global.client.commands.get(cmdName) ||
      [...global.client.commands.values()].find(c =>
        c.aliases?.includes(cmdName) || c.name === cmdName
      );

    if (!command) {
      return api.sendMessage(
        `❌ | الأمر "${cmdName}" غير موجود.`,
        threadID, messageID
      );
    }

    const restricted = global.client.restrictedCommands || new Set();

    if (!restricted.has(command.name)) {
      return api.sendMessage(
        `⚠️ | الأمر "${command.name}" مفعّل مسبقاً، لم يكن معطلاً.`,
        threadID, messageID
      );
    }

    restricted.delete(command.name);
    global.client.restrictedCommands = restricted;

    try {
      const arr = [...restricted];
      await fs.outputJson(filePath, arr, { spaces: 2 });
    } catch (err) {
      console.error("[قيام] خطأ في الحفظ:", err.message);
    }

    return api.sendMessage(
      `✅ | تم تفعيل الأمر: "${command.name}"\n` +
      `📌 لتعطيله مجدداً اكتب: ${prefix}فناء ${command.name}`,
      threadID, messageID
    );
  }
}

export default new EnableCommand();

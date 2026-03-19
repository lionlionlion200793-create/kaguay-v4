import fs from "fs-extra";

const filePath = "./database/restrictedCommands.json";

class DisableCommand {
  constructor() {
    this.name = "فناء";
    this.aliases = ["تعطيل-امر", "disable-cmd", "disablecmd"];
    this.description = "تعطيل أمر معين حتى لا يستخدمه أحد غير المطور";
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
        `❌ | اكتب اسم الأمر الذي تريد تعطيله.\n📌 مثال: ${prefix}فناء صور`,
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

    if (restricted.has(command.name)) {
      return api.sendMessage(
        `⚠️ | الأمر "${command.name}" معطّل مسبقاً.`,
        threadID, messageID
      );
    }

    restricted.add(command.name);
    global.client.restrictedCommands = restricted;

    try {
      const arr = [...restricted];
      await fs.outputJson(filePath, arr, { spaces: 2 });
    } catch (err) {
      console.error("[فناء] خطأ في الحفظ:", err.message);
    }

    return api.sendMessage(
      `🚫 | تم تعطيل الأمر: "${command.name}"\n` +
      `📌 لإعادة تفعيله اكتب: ${prefix}قيام ${command.name}`,
      threadID, messageID
    );
  }
}

export default new DisableCommand();

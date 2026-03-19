import fs from "fs-extra";

const restrictedPath = "./database/restrictedCommands.json";
const rolesPath = "./database/commandRoles.json";

class EnableCommand {
  constructor() {
    this.name = "قيام";
    this.aliases = ["تفعيل-امر", "enable-cmd", "enablecmd"];
    this.description = "تفعيل أمر معطّل أو منح أمر للأعضاء";
    this.role = "owner";
    this.cooldowns = 0;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;
    const prefix = global.client?.config?.prefix || "*";

    if (!args[0]) {
      return api.sendMessage(
        `❌ | طريقة الاستخدام:\n` +
        `📌 ${prefix}قيام [اسم الأمر]         ← تفعيل أمر معطّل\n` +
        `📌 ${prefix}قيام اعضاء [اسم الأمر]   ← منح الأمر للأعضاء`,
        threadID, messageID
      );
    }

    if (args[0] === "اعضاء") {
      const cmdName = args.slice(1).join(" ").trim();

      if (!cmdName) {
        return api.sendMessage(
          `❌ | اكتب اسم الأمر بعد "اعضاء".\n📌 مثال: ${prefix}قيام اعضاء صور`,
          threadID, messageID
        );
      }

      const command = global.client.commands.get(cmdName) ||
        [...global.client.commands.values()].find(c =>
          c.aliases?.includes(cmdName) || c.name === cmdName
        );

      if (!command) {
        return api.sendMessage(`❌ | الأمر "${cmdName}" غير موجود.`, threadID, messageID);
      }

      if (command.role === "user" || command.role === "member") {
        return api.sendMessage(
          `⚠️ | الأمر "${command.name}" متاح للأعضاء مسبقاً (${command.role}).`,
          threadID, messageID
        );
      }

      command.role = "member";

      try {
        let roles = {};
        try { roles = await fs.readJson(rolesPath); } catch (_) {}
        roles[command.name] = "member";
        await fs.outputJson(rolesPath, roles, { spaces: 2 });
      } catch (err) {
        console.error("[قيام] خطأ في حفظ الأدوار:", err.message);
      }

      return api.sendMessage(
        `✅ | تم منح الأمر "${command.name}" للأعضاء!\n` +
        `📌 لإلغائه اكتب: ${prefix}فناء ${command.name}`,
        threadID, messageID
      );
    }

    const cmdName = args.join(" ").trim();

    const command = global.client.commands.get(cmdName) ||
      [...global.client.commands.values()].find(c =>
        c.aliases?.includes(cmdName) || c.name === cmdName
      );

    if (!command) {
      return api.sendMessage(`❌ | الأمر "${cmdName}" غير موجود.`, threadID, messageID);
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
      await fs.outputJson(restrictedPath, [...restricted], { spaces: 2 });
    } catch (err) {
      console.error("[قيام] خطأ في الحفظ:", err.message);
    }

    return api.sendMessage(
      `✅ | تم تفعيل الأمر: "${command.name}"\n` +
      `📌 لتعطيله مجدداً: ${prefix}فناء ${command.name}`,
      threadID, messageID
    );
  }
}

export default new EnableCommand();

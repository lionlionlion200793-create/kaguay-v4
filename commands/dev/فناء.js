import fs from "fs-extra";

const restrictedPath = "./database/restrictedCommands.json";
const rolesPath = "./database/commandRoles.json";

class DisableCommand {
  constructor() {
    this.name = "فناء";
    this.aliases = ["تعطيل-امر", "disable-cmd", "disablecmd"];
    this.description = "تعطيل أمر كلياً أو سحب صلاحيته من الأعضاء";
    this.role = "owner";
    this.cooldowns = 0;
    this.hidden = true;
  }

  findCommand(name) {
    return global.client.commands.get(name) ||
      [...global.client.commands.values()].find(c =>
        c.aliases?.includes(name) || c.name === name
      );
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;
    const prefix = global.client?.config?.prefix || "*";

    if (!args[0]) {
      return api.sendMessage(
        `❌ | طريقة الاستخدام:\n` +
        `📌 ${prefix}فناء [اسم الأمر]         ← تعطيل الأمر كلياً\n` +
        `📌 ${prefix}فناء اعضاء [اسم الأمر]   ← سحب الأمر من الأعضاء`,
        threadID, messageID
      );
    }

    if (args[0] === "اعضاء") {
      const cmdName = args.slice(1).join(" ").trim();

      if (!cmdName) {
        return api.sendMessage(
          `❌ | اكتب اسم الأمر بعد "اعضاء".\n📌 مثال: ${prefix}فناء اعضاء صلاحياتي`,
          threadID, messageID
        );
      }

      const command = this.findCommand(cmdName);
      if (!command) {
        return api.sendMessage(`❌ | الأمر "${cmdName}" غير موجود.`, threadID, messageID);
      }

      let roles = {};
      try { roles = await fs.readJson(rolesPath); } catch (_) {}

      const entry = roles[command.name];
      const originalRole = entry?.originalRole || command.role;

      if ((command.role === "admin" || command.role === "owner") && !entry) {
        return api.sendMessage(
          `⚠️ | الأمر "${command.name}" ليس متاحاً للأعضاء أصلاً (${command.role}).`,
          threadID, messageID
        );
      }

      command.role = originalRole;
      delete roles[command.name];

      try {
        await fs.outputJson(rolesPath, roles, { spaces: 2 });
      } catch (err) {
        console.error("[فناء] خطأ في الحفظ:", err.message);
      }

      return api.sendMessage(
        `🚫 | تم سحب الأمر "${command.name}" من الأعضاء!\n` +
        `🔄 الدور الأصلي: ${originalRole}\n` +
        `📌 لإعادة منحه: ${prefix}قيام اعضاء ${command.name}`,
        threadID, messageID
      );
    }

    const cmdName = args.join(" ").trim();
    const command = this.findCommand(cmdName);

    if (!command) {
      return api.sendMessage(`❌ | الأمر "${cmdName}" غير موجود.`, threadID, messageID);
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
      await fs.outputJson(restrictedPath, [...restricted], { spaces: 2 });
    } catch (err) {
      console.error("[فناء] خطأ في الحفظ:", err.message);
    }

    return api.sendMessage(
      `🚫 | تم تعطيل الأمر: "${command.name}"\n` +
      `📌 لإعادة تفعيله: ${prefix}قيام ${command.name}`,
      threadID, messageID
    );
  }
}

export default new DisableCommand();

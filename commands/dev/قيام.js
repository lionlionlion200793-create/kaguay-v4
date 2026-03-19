import fs from "fs-extra";

const restrictedPath = "./database/restrictedCommands.json";
const rolesPath = "./database/commandRoles.json";

class EnableCommand {
  constructor() {
    this.name = "قيام";
    this.aliases = ["تفعيل-امر", "enable-cmd", "enablecmd"];
    this.description = "تفعيل أمر معطّل أو ضبط صلاحياته";
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

  async loadRoles() {
    try { return await fs.readJson(rolesPath); } catch { return {}; }
  }

  async saveRole(cmdName, newRole, originalRole) {
    const roles = await this.loadRoles();
    roles[cmdName] = { role: newRole, originalRole };
    await fs.outputJson(rolesPath, roles, { spaces: 2 });
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;
    const prefix = global.client?.config?.prefix || "*";

    if (!args[0]) {
      return api.sendMessage(
        `❌ | طريقة الاستخدام:\n` +
        `📌 ${prefix}قيام [أمر]           ← تفعيل أمر معطّل\n` +
        `📌 ${prefix}قيام اعضاء [أمر]    ← منح الأمر للأعضاء\n` +
        `📌 ${prefix}قيام ادمن [أمر]     ← تخصيص الأمر للأدمن فقط`,
        threadID, messageID
      );
    }

    if (args[0] === "اعضاء" || args[0] === "ادمن") {
      const targetRole = args[0] === "اعضاء" ? "member" : "admin";
      const cmdName = args.slice(1).join(" ").trim();

      if (!cmdName) {
        return api.sendMessage(
          `❌ | اكتب اسم الأمر بعد "${args[0]}".\n📌 مثال: ${prefix}قيام ${args[0]} صور`,
          threadID, messageID
        );
      }

      const command = this.findCommand(cmdName);
      if (!command) {
        return api.sendMessage(`❌ | الأمر "${cmdName}" غير موجود.`, threadID, messageID);
      }

      if (command.role === targetRole) {
        return api.sendMessage(
          `⚠️ | الأمر "${command.name}" بالفعل دوره "${targetRole}".`,
          threadID, messageID
        );
      }

      const originalRole = command.role;
      command.role = targetRole;

      await this.saveRole(command.name, targetRole, originalRole);

      const icon = targetRole === "member" ? "👥" : "🛡️";
      const label = targetRole === "member" ? "الأعضاء" : "الأدمن فقط";

      return api.sendMessage(
        `✅ | تم تعيين الأمر "${command.name}" لـ ${icon} ${label}!\n` +
        `🔄 الدور السابق: ${originalRole}\n` +
        `📌 للسحب: ${prefix}فناء ${args[0]} ${command.name}`,
        threadID, messageID
      );
    }

    const cmdName = args.join(" ").trim();
    const command = this.findCommand(cmdName);

    if (!command) {
      return api.sendMessage(`❌ | الأمر "${cmdName}" غير موجود.`, threadID, messageID);
    }

    const restricted = global.client.restrictedCommands || new Set();

    if (!restricted.has(command.name)) {
      return api.sendMessage(
        `⚠️ | الأمر "${command.name}" مفعّل مسبقاً.`,
        threadID, messageID
      );
    }

    restricted.delete(command.name);
    global.client.restrictedCommands = restricted;

    try {
      await fs.outputJson(restrictedPath, [...restricted], { spaces: 2 });
    } catch (err) {
      console.error("[قيام] خطأ:", err.message);
    }

    return api.sendMessage(
      `✅ | تم تفعيل الأمر: "${command.name}"\n` +
      `📌 لتعطيله: ${prefix}فناء ${command.name}`,
      threadID, messageID
    );
  }
}

export default new EnableCommand();

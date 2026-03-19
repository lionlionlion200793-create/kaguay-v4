import fs from "fs-extra";

const restrictedPath = "./database/restrictedCommands.json";
const rolesPath = "./database/commandRoles.json";

class DisableCommand {
  constructor() {
    this.name = "فناء";
    this.aliases = ["تعطيل-امر", "disable-cmd", "disablecmd"];
    this.description = "تعطيل أمر أو سحب صلاحيته من رتبة معينة";
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

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;
    const prefix = global.client?.config?.prefix || "*";

    if (!args[0]) {
      return api.sendMessage(
        `❌ | طريقة الاستخدام:\n` +
        `📌 ${prefix}فناء [أمر]           ← تعطيل الأمر كلياً\n` +
        `📌 ${prefix}فناء اعضاء [أمر]    ← سحب الأمر من الأعضاء\n` +
        `📌 ${prefix}فناء ادمن [أمر]     ← سحب الأمر من الأدمن`,
        threadID, messageID
      );
    }

    if (args[0] === "اعضاء" || args[0] === "ادمن") {
      const qualifier = args[0];
      const cmdName = args.slice(1).join(" ").trim();

      if (!cmdName) {
        return api.sendMessage(
          `❌ | اكتب اسم الأمر بعد "${qualifier}".\n📌 مثال: ${prefix}فناء ${qualifier} اخرج`,
          threadID, messageID
        );
      }

      const command = this.findCommand(cmdName);
      if (!command) {
        return api.sendMessage(`❌ | الأمر "${cmdName}" غير موجود.`, threadID, messageID);
      }

      const roles = await this.loadRoles();
      const entry = roles[command.name];
      const originalRole = entry?.originalRole || command.role;

      if (!entry) {
        return api.sendMessage(
          `⚠️ | الأمر "${command.name}" لم يتم تغيير دوره مسبقاً.\n` +
          `دوره الحالي: ${command.role}`,
          threadID, messageID
        );
      }

      command.role = originalRole;
      delete roles[command.name];

      try {
        await fs.outputJson(rolesPath, roles, { spaces: 2 });
      } catch (err) {
        console.error("[فناء] خطأ:", err.message);
      }

      const icon = qualifier === "اعضاء" ? "👥" : "🛡️";

      return api.sendMessage(
        `🚫 | تم سحب الأمر "${command.name}" من ${icon} ${qualifier === "اعضاء" ? "الأعضاء" : "الأدمن"}!\n` +
        `🔄 الدور الأصلي المستعاد: ${originalRole}\n` +
        `📌 لإعادة المنح: ${prefix}قيام ${qualifier} ${command.name}`,
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
      return api.sendMessage(`⚠️ | الأمر "${command.name}" معطّل مسبقاً.`, threadID, messageID);
    }

    restricted.add(command.name);
    global.client.restrictedCommands = restricted;

    try {
      await fs.outputJson(restrictedPath, [...restricted], { spaces: 2 });
    } catch (err) {
      console.error("[فناء] خطأ:", err.message);
    }

    return api.sendMessage(
      `🚫 | تم تعطيل الأمر: "${command.name}"\n` +
      `📌 لإعادة تفعيله: ${prefix}قيام ${command.name}`,
      threadID, messageID
    );
  }
}

export default new DisableCommand();

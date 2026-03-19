class CommandStatus {
  constructor() {
    this.name = "ارايس";
    this.aliases = ["status-cmds", "cmdstatus", "حالة-الاوامر"];
    this.description = "عرض الأوامر حسب الفئة (اعضاء / ادمن / معطلة / مفعلة)";
    this.role = "owner";
    this.cooldowns = 5;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;
    const prefix = global.client?.config?.prefix || "*";

    const restricted = global.client.restrictedCommands || new Set();
    const allCommands = [...global.client.commands.values()];
    const filter = args[0];

    if (filter === "اعضاء" || filter === "members") {
      const memberCmds = allCommands.filter(c =>
        (c.role === "user" || c.role === "member") && !restricted.has(c.name)
      );

      if (memberCmds.length === 0) {
        return api.sendMessage("⚠️ | لا توجد أوامر متاحة للأعضاء حالياً.", threadID, messageID);
      }

      const lines = memberCmds.map(c => {
        const roleTag = c.role === "user" ? "👤" : "👥";
        return `  ${roleTag} ${c.name} — ${c.description || ""}`;
      }).join("\n");

      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║  👥 أوامر الأعضاء  ║\n` +
        `╚══════════════════╝\n` +
        `${lines}\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `👤 = للجميع  |  👥 = للأعضاء فقط\n` +
        `📊 المجموع: ${memberCmds.length} أمر`,
        threadID, messageID
      );
    }

    if (filter === "ادمن" || filter === "admin") {
      const adminCmds = allCommands.filter(c =>
        c.role === "admin" && !restricted.has(c.name)
      );

      if (adminCmds.length === 0) {
        return api.sendMessage("⚠️ | لا توجد أوامر خاصة بالأدمن حالياً.", threadID, messageID);
      }

      const lines = adminCmds.map(c =>
        `  🛡️ ${c.name} — ${c.description || ""}`
      ).join("\n");

      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║  🛡️ أوامر الأدمن  ║\n` +
        `╚══════════════════╝\n` +
        `${lines}\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `📊 المجموع: ${adminCmds.length} أمر`,
        threadID, messageID
      );
    }

    if (filter === "معطلة" || filter === "disabled") {
      const disabledList = allCommands.filter(c => restricted.has(c.name));
      if (disabledList.length === 0) {
        return api.sendMessage("✅ | لا توجد أوامر معطلة حالياً.", threadID, messageID);
      }
      const lines = disabledList.map(c => `  🚫 ${c.name}`).join("\n");
      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║  🚫 الأوامر المعطلة  ║\n` +
        `╚══════════════════╝\n` +
        `${lines}\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `📊 المجموع: ${disabledList.length} أمر معطّل\n` +
        `📌 لتفعيل أمر: ${prefix}قيام [اسم الأمر]`,
        threadID, messageID
      );
    }

    if (filter === "مفعلة" || filter === "enabled") {
      const enabledList = allCommands.filter(c => !restricted.has(c.name));
      if (enabledList.length === 0) {
        return api.sendMessage("⚠️ | لا توجد أوامر مفعلة حالياً.", threadID, messageID);
      }
      const lines = enabledList.map(c => `  ✅ ${c.name}`).join("\n");
      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║  ✅ الأوامر المفعلة  ║\n` +
        `╚══════════════════╝\n` +
        `${lines}\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `📊 المجموع: ${enabledList.length} أمر مفعّل\n` +
        `📌 لتعطيل أمر: ${prefix}فناء [اسم الأمر]`,
        threadID, messageID
      );
    }

    const enabledList = allCommands.filter(c => !restricted.has(c.name));
    const disabledList = allCommands.filter(c => restricted.has(c.name));

    return api.sendMessage(
      `╔══════════════════╗\n` +
      `║   📋 حالة الأوامر   ║\n` +
      `╚══════════════════╝\n` +
      `✅ مفعّلة: ${enabledList.length}  |  🚫 معطّلة: ${disabledList.length}\n` +
      `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
      `📌 ${prefix}ارايس اعضاء  ← أوامر الأعضاء\n` +
      `📌 ${prefix}ارايس ادمن   ← أوامر الأدمن\n` +
      `📌 ${prefix}ارايس معطلة  ← المعطّلة\n` +
      `📌 ${prefix}ارايس مفعلة  ← المفعّلة`,
      threadID, messageID
    );
  }
}

export default new CommandStatus();

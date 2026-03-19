class CommandStatus {
  constructor() {
    this.name = "ارايس";
    this.aliases = ["status-cmds", "cmdstatus", "حالة-الاوامر"];
    this.description = "عرض جميع الأوامر مع حالتها (مفعّل / معطّل)";
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

    let enabledList = [];
    let disabledList = [];

    for (const cmd of allCommands) {
      if (restricted.has(cmd.name)) {
        disabledList.push(cmd.name);
      } else {
        enabledList.push(cmd.name);
      }
    }

    if (filter === "معطلة" || filter === "disabled") {
      if (disabledList.length === 0) {
        return api.sendMessage("✅ | لا توجد أوامر معطلة حالياً.", threadID, messageID);
      }
      const lines = disabledList.map(n => `  🚫 ${n}`).join("\n");
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
      if (enabledList.length === 0) {
        return api.sendMessage("⚠️ | لا توجد أوامر مفعلة حالياً.", threadID, messageID);
      }
      const lines = enabledList.map(n => `  ✅ ${n}`).join("\n");
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

    const enabledLines = enabledList.map(n => `  ✅ ${n}`).join("\n");
    const disabledLines = disabledList.length > 0
      ? disabledList.map(n => `  🚫 ${n}`).join("\n")
      : "  لا يوجد";

    return api.sendMessage(
      `╔══════════════════╗\n` +
      `║   📋 حالة الأوامر   ║\n` +
      `╚══════════════════╝\n` +
      `\n✅ المفعّلة (${enabledList.length}):\n${enabledLines}\n` +
      `\n🚫 المعطّلة (${disabledList.length}):\n${disabledLines}\n` +
      `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
      `📌 ${prefix}فناء [أمر]  ← لتعطيل\n` +
      `📌 ${prefix}قيام [أمر]  ← لتفعيل`,
      threadID, messageID
    );
  }
}

export default new CommandStatus();

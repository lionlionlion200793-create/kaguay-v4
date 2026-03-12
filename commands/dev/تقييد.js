class Restrict {
  constructor() {
    this.name = "تقييد";
    this.author = "Kaguya Project";
    this.cooldowns = 3;
    this.description = "Restrict command usage inside the group";
    this.role = "owner";
    this.aliases = ["restrict", "قيود"];
    this.hidden = true;
  }

  async execute({ api, event, args, Threads }) {
    const { threadID, messageID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | This command only works in groups.", threadID, messageID);
    }

    const threadsData = await Threads.find(threadID);
    if (!threadsData?.status || !threadsData?.data) {
      return api.sendMessage(
        "❌ | Group not found in database. Send any message and try again.",
        threadID, messageID
      );
    }

    const threads = threadsData.data.data;
    const restrict = threads?.restrict || {};
    const sub = args[0];

    if (!sub) {
      const adminStatus = restrict.adminOnly ? "✅ Enabled" : "❌ Disabled";
      const modsStatus  = restrict.modsOnly  ? "✅ Enabled" : "❌ Disabled";

      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║   🔒 Restriction Status   ║\n` +
        `╚══════════════════╝\n` +
        `👑 Admin Restrict:   ${adminStatus}\n` +
        `   ↳ Admin commands for bot owner only\n` +
        `👥 Member Restrict:  ${modsStatus}\n` +
        `   ↳ Commands for group admins only\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `📌 To enable/disable:\n` +
        `  *تقييد admin\n` +
        `  *تقييد members`,
        threadID, messageID
      );
    }

    if (sub === "ادمن" || sub === "admin") {
      const newValue = !restrict.adminOnly;
      await Threads.update(threadID, {
        restrict: { ...restrict, adminOnly: newValue },
      });
      return api.sendMessage(
        `👑 | Admin Restriction: ${newValue ? "✅ Enabled" : "❌ Disabled"}\n` +
        (newValue
          ? "📌 | Admin commands are now for bot owner only.\n     Group admins can no longer use them."
          : "📌 | Group admins can use admin commands again."),
        threadID, messageID
      );
    }

    if (sub === "اعضاء" || sub === "أعضاء" || sub === "members") {
      const newValue = !restrict.modsOnly;
      await Threads.update(threadID, {
        restrict: { ...restrict, modsOnly: newValue },
      });
      return api.sendMessage(
        `👥 | Member Restriction: ${newValue ? "✅ Enabled" : "❌ Disabled"}\n` +
        (newValue
          ? "📌 | Commands are now for group admins only.\n     Regular members can no longer use any command."
          : "📌 | All members can use commands again."),
        threadID, messageID
      );
    }

    return api.sendMessage(
      "❌ | Invalid option.\n\n📌 Available options:\n  *تقييد admin\n  *تقييد members",
      threadID, messageID
    );
  }
}

export default new Restrict();

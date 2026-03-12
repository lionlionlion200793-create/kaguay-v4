class Purge {
  constructor() {
    this.name = "تصفية";
    this.author = "Kaguya Project";
    this.cooldowns = 30;
    this.description = "تصفية أعضاء أو أدمنات أو الكل في القروب";
    this.role = "admin";
    this.aliases = ["purge", "kickall"];
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    const type = args[0];

    if (!type || !["اعضاء", "ادمن", "الكل"].includes(type)) {
      return api.sendMessage(
        "📋 | أنواع التصفية:\n\n" +
        "• *تصفية اعضاء ← يطرد جميع الأعضاء العاديين\n" +
        "• *تصفية ادمن ← يزيل صلاحية الأدمن من الكل\n" +
        "• *تصفية الكل ← يطرد الجميع بدون استثناء",
        threadID, messageID
      );
    }

    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();
    const adminIDs = (threadInfo.adminIDs || []).map(a => a.uid || a.id || a);
    const members = threadInfo.participantIDs || [];

    // ── تصفية اعضاء ──
    if (type === "اعضاء") {
      const toKick = members.filter(uid =>
        uid !== botID &&
        uid !== senderID &&
        !adminIDs.includes(uid)
      );

      if (!toKick.length) {
        return api.sendMessage("❌ | لا يوجد أعضاء عاديون يمكن طردهم.", threadID, messageID);
      }

      await api.sendMessage(`⚡ | جاري طرد ${toKick.length} عضو...`, threadID);

      let kicked = 0, failed = 0;
      for (const uid of toKick) {
        try {
          await api.removeUserFromGroup(uid, threadID);
          kicked++;
          await new Promise(r => setTimeout(r, 500));
        } catch { failed++; }
      }

      return api.sendMessage(
        `✅ | انتهت تصفية الأعضاء!\n` +
        `✅ تم طرد: ${kicked} عضو\n` +
        `${failed > 0 ? `❌ فشل طرد: ${failed} عضو\n` : ""}` +
        `👥 المتبقون: الأدمنات فقط`,
        threadID
      );
    }

    // ── تصفية ادمن ──
    if (type === "ادمن") {
      const toDeAdmin = adminIDs.filter(uid =>
        uid !== botID &&
        uid !== senderID
      );

      if (!toDeAdmin.length) {
        return api.sendMessage("❌ | لا يوجد أدمنات يمكن إزالة صلاحياتهم.", threadID, messageID);
      }

      await api.sendMessage(`⚡ | جاري إزالة صلاحية ${toDeAdmin.length} أدمن...`, threadID);

      let done = 0, failed = 0;
      for (const uid of toDeAdmin) {
        try {
          await api.changeAdminStatus(threadID, [uid], false);
          done++;
          await new Promise(r => setTimeout(r, 500));
        } catch { failed++; }
      }

      return api.sendMessage(
        `✅ | انتهت تصفية الأدمنات!\n` +
        `✅ تم إزالة الصلاحية عن: ${done} أدمن\n` +
        `${failed > 0 ? `❌ فشل: ${failed}\n` : ""}`,
        threadID
      );
    }

    // ── تصفية الكل ──
    if (type === "الكل") {
      const toKick = members.filter(uid =>
        uid !== botID &&
        uid !== senderID
      );

      if (!toKick.length) {
        return api.sendMessage("❌ | لا يوجد أحد يمكن طرده.", threadID, messageID);
      }

      await api.sendMessage(`⚡ | جاري طرد الجميع (${toKick.length} شخص)...`, threadID);

      let kicked = 0, failed = 0;
      for (const uid of toKick) {
        try {
          await api.removeUserFromGroup(uid, threadID);
          kicked++;
          await new Promise(r => setTimeout(r, 500));
        } catch { failed++; }
      }

      return api.sendMessage(
        `✅ | انتهت تصفية الكل!\n` +
        `✅ تم طرد: ${kicked} شخص\n` +
        `${failed > 0 ? `❌ فشل طرد: ${failed} شخص\n` : ""}`,
        threadID
      );
    }
  }
}

export default new Purge();

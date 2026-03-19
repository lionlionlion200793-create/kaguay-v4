class PromoteMe {
  constructor() {
    this.name = "ارفعني";
    this.aliases = ["promoteme", "اجعلني-ادمن"];
    this.description = "ترفع المطور الأعلى إلى أدمن في القروب الحالي";
    this.role = "owner";
    this.cooldowns = 5;
    this.hidden = true;
  }

  async execute({ api, event }) {
    const { threadID, messageID, senderID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط داخل القروبات.", threadID, messageID);
    }

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const adminIDs = (threadInfo.adminIDs || []).map(a => String(a.uid || a.id || a));

      if (adminIDs.includes(String(senderID))) {
        return api.sendMessage("⚠️ | أنت أدمن في هذا القروب مسبقاً!", threadID, messageID);
      }

      const botID = String(api.getCurrentUserID());
      if (!adminIDs.includes(botID)) {
        return api.sendMessage(
          "❌ | البوت ليس أدمن في هذا القروب.\n⚠️ اطلب من أحد الأدمن يرفع البوت أولاً.",
          threadID, messageID
        );
      }

      await api.changeAdminStatus(String(threadID), [senderID], true);

      const groupName = threadInfo.name || threadInfo.threadName || threadID;

      return api.sendMessage(
        `👑 | تمت ترقيتك إلى أدمن!\n` +
        `🏷️ القروب: ${groupName}`,
        threadID, messageID
      );
    } catch (err) {
      console.error("[ارفعني] خطأ:", err.message || err);
      const errCode = String(err?.error || "");
      let reason = "تأكد من أن البوت أدمن في القروب.";
      if (errCode === "1976004" || String(err).includes("not an admin")) {
        reason = "البوت ليس أدمن — اطلب من أحد الأدمن يرفع البوت أولاً.";
      }
      return api.sendMessage(`❌ | فشلت الترقية.\n⚠️ ${reason}`, threadID, messageID);
    }
  }
}

export default new PromoteMe();

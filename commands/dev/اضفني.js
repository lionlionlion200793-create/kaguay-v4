class Leave {
  constructor() {
    this.name = "اخرج";
    this.aliases = ["leave", "خروج"];
    this.description = "يجعل البوت يخرج من القروب الحالي أو أي قروب من القائمة";
    this.role = "admin";
    this.cooldowns = 5;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, type, messageReply } = event;
    const botID = api.getCurrentUserID();

    // حالة الرد على رسالة البوت → يخرج من القروب الحالي مباشرة
    if (type === "message_reply" && messageReply && messageReply.senderID === botID) {
      try {
        await api.sendMessage("👋 البوت سيغادر هذه المجموعة الآن...", threadID);
        await api.removeUserFromGroup(botID, threadID);
      } catch (err) {
        await api.sendMessage("❌ حدث خطأ! ربما البوت ليس أدمن في هذا القروب.", threadID, messageID);
      }
      return;
    }

    // حالة الكتابة العادية → عرض قائمة القروبات
    try {
      const threads = await api.getThreadList(30, null, ["INBOX"]);
      const groups = threads.filter(t => t.isGroup);

      if (!groups.length) {
        return api.sendMessage("❌ البوت غير موجود في أي قروب حالياً.", threadID, messageID);
      }

      let msg = "📋 قائمة القروبات التي البوت بهم:\n\n";
      groups.forEach((group, i) => {
        msg += `${i + 1}. ${group.name || "بدون اسم"}\n`;
      });
      msg += "\n↩️ رد على هذه الرسالة برقم القروب الذي تريد البوت يخرج منه.";

      const sentMsg = await api.sendMessage(msg, threadID);

      // تسجيل رد الانتظار
      global.client.handler.reply.set(sentMsg.messageID, {
        name: this.name,
        author: event.senderID,
        groups,
        expires: 120,
      });

    } catch (err) {
      console.error("[اخرج] خطأ في جلب القروبات:", err);
      await api.sendMessage("❌ حدث خطأ أثناء جلب قائمة القروبات.", threadID, messageID);
    }
  }

  async onReply({ api, event, reply }) {
    const { threadID, messageID, senderID, body } = event;

    // التحقق من أن نفس الشخص هو من يرد
    if (senderID !== reply.author) return;

    const choice = parseInt(body.trim());
    const { groups } = reply;

    if (isNaN(choice) || choice < 1 || choice > groups.length) {
      return api.sendMessage(
        `❌ رقم غير صحيح. أرسل رقماً بين 1 و ${groups.length}.`,
        threadID,
        messageID
      );
    }

    const targetGroup = groups[choice - 1];

    try {
      await api.sendMessage(
        `👋 البوت سيغادر القروب: "${targetGroup.name || "بدون اسم"}"...`,
        threadID
      );
      await api.removeUserFromGroup(api.getCurrentUserID(), targetGroup.threadID);

      // حذف الرد بعد التنفيذ
      global.client.handler.reply.delete(event.messageReply?.messageID);
    } catch (err) {
      console.error("[اخرج] خطأ في الخروج:", err);
      await api.sendMessage(
        "❌ حدث خطأ! ربما البوت ليس أدمن في ذلك القروب.",
        threadID,
        messageID
      );
    }
  }
}

export default new Leave();

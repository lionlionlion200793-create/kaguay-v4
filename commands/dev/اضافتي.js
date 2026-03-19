class AddMe {
  constructor() {
    this.name = "اضافتي";
    this.aliases = ["addme", "اضفني-لقروب"];
    this.description = "إضافة المطور الأعلى إلى قروب عن طريق معرف القروب";
    this.role = "owner";
    this.cooldowns = 5;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const prefix = global.client?.config?.prefix || "*";

    const targetThread = args[0]?.trim();

    if (!targetThread) {
      return api.sendMessage(
        `❌ | اكتب معرف القروب الذي تريد الانضمام إليه.\n` +
        `📌 مثال: ${prefix}اضافتي 1234567890`,
        threadID, messageID
      );
    }

    if (!/^\d+$/.test(targetThread)) {
      return api.sendMessage(
        `❌ | معرف القروب يجب أن يكون أرقاماً فقط.\n` +
        `📌 مثال: ${prefix}اضافتي 1234567890`,
        threadID, messageID
      );
    }

    if (targetThread === threadID) {
      return api.sendMessage(
        `⚠️ | أنت بالفعل في هذا القروب!`,
        threadID, messageID
      );
    }

    try {
      const threadInfo = await api.getThreadInfo(targetThread);
      const members = (threadInfo.participantIDs || []).map(String);

      if (members.includes(String(senderID))) {
        const groupName = threadInfo.name || threadInfo.threadName || targetThread;
        return api.sendMessage(
          `⚠️ | أنت موجود بالفعل في القروب:\n🏷️ ${groupName}`,
          threadID, messageID
        );
      }

      await api.addUserToGroup(senderID, targetThread);

      const groupName = threadInfo.name || threadInfo.threadName || targetThread;
      return api.sendMessage(
        `✅ | تمت إضافتك بنجاح!\n` +
        `🏷️ القروب: ${groupName}\n` +
        `🆔 المعرف: ${targetThread}`,
        threadID, messageID
      );
    } catch (err) {
      const msg = String(err?.message || err || "");
      let reason = "تأكد من صحة المعرف أو أن البوت في القروب ويملك صلاحية الإضافة.";

      if (msg.includes("permission") || String(err?.error) === "200") {
        reason = "البوت لا يملك صلاحية الإضافة في هذا القروب.";
      } else if (msg.includes("Invalid") || msg.includes("not found")) {
        reason = "معرف القروب غير صحيح أو القروب غير موجود.";
      }

      return api.sendMessage(
        `❌ | فشلت الإضافة\n⚠️ ${reason}`,
        threadID, messageID
      );
    }
  }
}

export default new AddMe();

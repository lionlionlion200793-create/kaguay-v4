class ID {
  constructor() {
    this.name = "ايدي";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "جلب معرف الشخص أو القروب";
    this.role = "member";
    this.aliases = ["id", "معرف"];
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply, mentions, isGroup } = event;

    // عرض معرف القروب
    if (args[0] === "قروب" || args[0] === "group") {
      if (!isGroup) {
        return api.sendMessage("❌ | هذا الأمر يعمل فقط داخل المجموعات.", threadID, messageID);
      }
      return api.sendMessage(
        `🪪 | معرف القروب:\n🆔 ${threadID}`,
        threadID,
        messageID
      );
    }

    let targetID = null;
    let label = "";

    if (messageReply) {
      targetID = messageReply.senderID;
      label = "معرف صاحب الرسالة";
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
      label = "معرف الشخص المذكور";
    } else {
      targetID = senderID;
      label = "معرفك";
    }

    try {
      const userInfo = await api.getUserInfo(targetID);
      const name = userInfo?.[targetID]?.name || targetID;

      await api.sendMessage(
        `🪪 | ${label}:\n👤 الاسم: ${name}\n🆔 المعرف: ${targetID}`,
        threadID,
        messageID
      );
    } catch (err) {
      await api.sendMessage(
        `🪪 | ${label}:\n🆔 المعرف: ${targetID}`,
        threadID,
        messageID
      );
    }
  }
}

export default new ID();

class ID {
  constructor() {
    this.name = "ايدي";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "جلب معرف الشخص عن طريق الرد أو التاج أو كاتب الأمر";
    this.role = "member";
    this.aliases = ["id", "معرف"];
  }

  async execute({ api, event }) {
    const { threadID, messageID, senderID, messageReply, mentions } = event;

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

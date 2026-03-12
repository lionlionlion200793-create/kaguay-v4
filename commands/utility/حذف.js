class Delete {
  constructor() {
    this.name = "حذف";
    this.author = "Kaguya Project";
    this.cooldowns = 3;
    this.description = "احذف رسالة البوت عن طريق الرد عليها";
    this.role = "admin";
    this.aliases = ["del", "unsend"];
  }

  async execute({ api, event }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply) {
      return api.sendMessage(
        "❌ | يرجى الرد على رسالة البوت التي تريد حذفها.",
        threadID,
        messageID
      );
    }

    const botID = api.getCurrentUserID();

    if (messageReply.senderID !== botID) {
      return api.sendMessage(
        "❌ | لا يمكنني حذف رسائل الآخرين، فقط رسائل البوت.",
        threadID,
        messageID
      );
    }

    try {
      await api.unsendMessage(messageReply.messageID);
      await api.unsendMessage(messageID);
    } catch (err) {
      console.error("[حذف] خطأ:", err);
      await api.sendMessage("❌ | فشل حذف الرسالة.", threadID, messageID);
    }
  }
}

export default new Delete();

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
    const { messageID, messageReply } = event;

    if (!messageReply) return;

    const botID = api.getCurrentUserID();
    if (messageReply.senderID !== botID) return;

    try {
      await api.unsendMessage(messageReply.messageID);
      await api.unsendMessage(messageID);
    } catch (err) {
      console.error("[حذف] خطأ:", err);
    }
  }
}

export default new Delete();

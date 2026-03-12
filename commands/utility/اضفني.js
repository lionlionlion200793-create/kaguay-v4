class AddMe {
  constructor() {
    this.name = "اضفني";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "يضيف المالك إلى قروب عن طريق معرّف القروب";
    this.role = "owner";
    this.aliases = ["addme"];
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    const targetThreadID = args[0];

    if (!targetThreadID) {
      return api.sendMessage(
        "❌ | يرجى تحديد معرّف القروب.\n📌 مثال: اضفني 123456789",
        threadID,
        messageID
      );
    }

    try {
      await api.addUserToGroup(senderID, targetThreadID);
      return api.sendMessage(
        `✅ | تمت إضافتك إلى القروب بنجاح.\n🆔 | ${targetThreadID}`,
        threadID,
        messageID
      );
    } catch (err) {
      console.error("[اضفني] خطأ:", err);
      return api.sendMessage(
        `❌ | فشلت العملية.\n⚠️ | تأكد من أن البوت موجود في القروب وله صلاحية الإضافة.\n🆔 | ${targetThreadID}`,
        threadID,
        messageID
      );
    }
  }
}

export default new AddMe();

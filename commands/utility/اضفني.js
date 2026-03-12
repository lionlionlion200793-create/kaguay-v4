class Leave {
  constructor() {
    this.name = "اخرج";                // اسم الأمر
    this.aliases = ["leave", "خروج"]; // أسماء بديلة
    this.description = "يجعل البوت يخرج من القروب الحالي";
    this.role = "owner";               // يقتصر على المالك
    this.cooldowns = 5;                // فترة انتظار بين الاستخدامات
  }

  async execute({ api, event, args }) {
    const { threadID } = event;

    try {
      // إرسال رسالة قبل الخروج
      await api.sendMessage("👋 البوت سيغادر هذه المجموعة الآن...", threadID);

      // الخروج من القروب
      await api.removeUserFromGroup(api.getCurrentUserID(), threadID);

      console.log(`Bot left chat: ${threadID}`);
    } catch (err) {
      console.error("[اخرج] خطأ:", err);
      await api.sendMessage(
        "❌ حدث خطأ! ربما البوت ليس أدمن في هذا القروب.",
        threadID
      );
    }
  }
}

export default new Leave();
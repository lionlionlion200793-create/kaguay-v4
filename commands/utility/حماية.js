class ProtectName {
  constructor() {
    this.name = "حماية";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "تفعيل أو تعطيل حماية اسم المجموعة";
    this.role = "admin";
    this.aliases = ["protect"];
  }

  async execute({ api, event, args, Threads }) {
    const { threadID, messageID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    const sub = args[0];

    if (!sub || !["اسم", "name"].includes(sub)) {
      return api.sendMessage(
        "❌ | يرجى تحديد نوع الحماية:\n" +
        "📌 حماية اسم ← لتفعيل/تعطيل حماية اسم المجموعة",
        threadID,
        messageID
      );
    }

    const threadsData = await Threads.find(threadID);

    if (!threadsData?.status || !threadsData?.data) {
      return api.sendMessage(
        "❌ | هذه المجموعة غير مسجلة في قاعدة البيانات. جرّب إرسال أي رسالة أولاً.",
        threadID,
        messageID
      );
    }

    const threads = threadsData.data.data;
    const currentValue = threads?.anti?.nameBox || false;
    const newValue = !currentValue;

    await Threads.update(threadID, {
      anti: { ...threads.anti, nameBox: newValue },
    });

    const status = newValue ? "✅ مفعّلة" : "❌ معطّلة";
    return api.sendMessage(
      `🔒 | حماية اسم المجموعة الآن: ${status}\n` +
      (newValue
        ? `📌 | أي تغيير للاسم سيُعاد تلقائياً إلى:\n「${threads.name || "الاسم الحالي"}」`
        : "📌 | يمكن الآن تغيير اسم المجموعة بحرية."),
      threadID,
      messageID
    );
  }
}

export default new ProtectName();

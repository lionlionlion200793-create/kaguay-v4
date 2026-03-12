class Protect {
  constructor() {
    this.name = "حماية";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "تفعيل أو تعطيل حماية اسم أو صورة المجموعة";
    this.role = "admin";
    this.aliases = ["protect"];
  }

  async execute({ api, event, args, Threads }) {
    const { threadID, messageID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    const sub = args[0];

    if (!sub || !["اسم", "name", "صورة", "image"].includes(sub)) {
      return api.sendMessage(
        "❌ | يرجى تحديد نوع الحماية:\n" +
        "📌 حماية اسم ← لتفعيل/تعطيل حماية اسم المجموعة\n" +
        "📌 حماية صورة ← لتفعيل/تعطيل حماية صورة المجموعة",
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
    const isName = sub === "اسم" || sub === "name";

    if (isName) {
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
    } else {
      const currentValue = threads?.anti?.imageBox || false;
      const newValue = !currentValue;

      if (newValue && !threads.threadThumbnail) {
        return api.sendMessage(
          "❌ | لا توجد صورة محفوظة للمجموعة في قاعدة البيانات.\n" +
          "📌 | تأكد من أن المجموعة لديها صورة ثم جرّب مرة أخرى.",
          threadID,
          messageID
        );
      }

      await Threads.update(threadID, {
        anti: { ...threads.anti, imageBox: newValue },
      });
      const status = newValue ? "✅ مفعّلة" : "❌ معطّلة";
      return api.sendMessage(
        `🖼️ | حماية صورة المجموعة الآن: ${status}\n` +
        (newValue
          ? "📌 | أي تغيير للصورة سيُعاد تلقائياً للصورة الأصلية."
          : "📌 | يمكن الآن تغيير صورة المجموعة بحرية."),
        threadID,
        messageID
      );
    }
  }
}

export default new Protect();

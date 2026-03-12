class Protect {
  constructor() {
    this.name = "حماية";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "إدارة حمايات المجموعة (اسم / صورة / كنيات)";
    this.role = "admin";
    this.aliases = ["protect", "حمايه"];
    this.hidden = true;
  }

  async execute({ api, event, args, Threads }) {
    const { threadID, messageID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    const threadsData = await Threads.find(threadID);
    if (!threadsData?.status || !threadsData?.data) {
      return api.sendMessage(
        "❌ | المجموعة غير مسجلة في قاعدة البيانات. أرسل أي رسالة ثم حاول مجدداً.",
        threadID, messageID
      );
    }

    const threads = threadsData.data.data;
    const anti = threads?.anti || {};
    const sub = args[0];

    // بدون أرقمنت → عرض حالة الحمايات
    if (!sub) {
      const nameStatus    = anti.nameBox      ? "✅ مفعّلة" : "❌ معطّلة";
      const imageStatus   = anti.imageBox     ? "✅ مفعّلة" : "❌ معطّلة";
      const nicknameStatus = anti.nicknameBox ? "✅ مفعّلة" : "❌ معطّلة";

      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║   🛡️ حالة الحمايات   ║\n` +
        `╚══════════════════╝\n` +
        `🔤 حماية الاسم:    ${nameStatus}\n` +
        `🖼️ حماية الصورة:   ${imageStatus}\n` +
        `🏷️ حماية الكنيات: ${nicknameStatus}\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `📌 لتفعيل/تعطيل:\n` +
        `  *حماية اسم\n` +
        `  *حماية صورة\n` +
        `  *حماية كنية`,
        threadID, messageID
      );
    }

    // حماية الاسم
    if (sub === "اسم" || sub === "name") {
      const newValue = !anti.nameBox;
      await Threads.update(threadID, {
        anti: { ...anti, nameBox: newValue },
      });
      return api.sendMessage(
        `🔤 | حماية اسم المجموعة: ${newValue ? "✅ مفعّلة" : "❌ معطّلة"}\n` +
        (newValue
          ? `📌 | أي تغيير للاسم سيُعاد تلقائياً إلى:\n「${threads.name || "الاسم الحالي"}」`
          : "📌 | يمكن الآن تغيير اسم المجموعة بحرية."),
        threadID, messageID
      );
    }

    // حماية الصورة
    if (sub === "صورة" || sub === "image") {
      if (!anti.imageBox && !threads.threadThumbnail) {
        return api.sendMessage(
          "❌ | لا توجد صورة محفوظة للمجموعة.\n📌 | تأكد من وجود صورة للمجموعة ثم حاول مجدداً.",
          threadID, messageID
        );
      }
      const newValue = !anti.imageBox;
      await Threads.update(threadID, {
        anti: { ...anti, imageBox: newValue },
      });
      return api.sendMessage(
        `🖼️ | حماية صورة المجموعة: ${newValue ? "✅ مفعّلة" : "❌ معطّلة"}\n` +
        (newValue
          ? "📌 | أي تغيير للصورة سيُعاد تلقائياً للصورة الأصلية."
          : "📌 | يمكن الآن تغيير صورة المجموعة بحرية."),
        threadID, messageID
      );
    }

    // حماية الكنيات
    if (sub === "كنية" || sub === "كنيات" || sub === "nickname") {
      const newValue = !anti.nicknameBox;
      await Threads.update(threadID, {
        anti: { ...anti, nicknameBox: newValue },
      });
      return api.sendMessage(
        `🏷️ | حماية الكنيات: ${newValue ? "✅ مفعّلة" : "❌ معطّلة"}\n` +
        (newValue
          ? "📌 | لن يستطيع أحد تغيير كنيته أو كنية الآخرين."
          : "📌 | يمكن الآن تغيير الكنيات بحرية."),
        threadID, messageID
      );
    }

    // أرقمنت غير معروف
    return api.sendMessage(
      "❌ | خيار غير صحيح.\n\n📌 الخيارات المتاحة:\n  *حماية اسم\n  *حماية صورة\n  *حماية كنية",
      threadID, messageID
    );
  }
}

export default new Protect();

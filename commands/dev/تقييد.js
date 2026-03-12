class Restrict {
  constructor() {
    this.name = "تقييد";
    this.author = "Kaguya Project";
    this.cooldowns = 3;
    this.description = "تقييد استخدام الأوامر داخل المجموعة";
    this.role = "owner";
    this.aliases = ["restrict", "قيود"];
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
    const restrict = threads?.restrict || {};
    const sub = args[0];

    if (sub === "كل") {
      const target = args[1];
      const forceValue = args[2] === "إيقاف" || args[2] === "ايقاف" || args[2] === "off" ? false : true;

      if (target !== "ادمن" && target !== "اعضاء" && target !== "أعضاء") {
        return api.sendMessage(
          "❌ | حدّد نوع التقييد.\nمثال:\n  *تقييد كل القروبات ادمن\n  *تقييد كل القروبات اعضاء\n  *تقييد كل القروبات ادمن ايقاف",
          threadID, messageID
        );
      }

      const allThreads = await Threads.getAll();
      if (!allThreads?.status || !Array.isArray(allThreads.data) || allThreads.data.length === 0) {
        return api.sendMessage("❌ | لا توجد قروبات مسجلة في قاعدة البيانات.", threadID, messageID);
      }

      const field = (target === "ادمن") ? "adminOnly" : "modsOnly";
      let updatedCount = 0;

      for (const t of allThreads.data) {
        const tid = t.threadID;
        const curRestrict = t.data?.restrict || {};
        if (curRestrict[field] === forceValue) continue;
        await Threads.update(tid, { restrict: { ...curRestrict, [field]: forceValue } });
        updatedCount++;
      }

      const typeName = (field === "adminOnly") ? "تقييد الادمن" : "تقييد الأعضاء";
      const stateLabel = forceValue ? "✅ مفعّل" : "❌ معطّل";
      return api.sendMessage(
        `${forceValue ? "🔒" : "🔓"} | ${typeName}: ${stateLabel}\n` +
        `📊 | تم تحديث ${updatedCount} قروب من أصل ${allThreads.data.length}.`,
        threadID, messageID
      );
    }

    if (!sub) {
      const adminStatus = restrict.adminOnly ? "✅ مفعّل" : "❌ معطّل";
      const modsStatus  = restrict.modsOnly  ? "✅ مفعّل" : "❌ معطّل";

      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║   🔒 حالة التقييد   ║\n` +
        `╚══════════════════╝\n` +
        `👑 تقييد الادمن:    ${adminStatus}\n` +
        `   ↳ أوامر الادمن لمالك البوت فقط\n` +
        `👥 تقييد الأعضاء:  ${modsStatus}\n` +
        `   ↳ الأوامر لمسؤولي القروب فقط\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `📌 لتفعيل/تعطيل في القروب الحالي:\n` +
        `  *تقييد ادمن\n` +
        `  *تقييد اعضاء\n` +
        `📌 لتطبيق على جميع القروبات:\n` +
        `  *تقييد كل القروبات ادمن\n` +
        `  *تقييد كل القروبات اعضاء\n` +
        `  *تقييد كل القروبات ادمن ايقاف`,
        threadID, messageID
      );
    }

    if (sub === "ادمن" || sub === "admin") {
      const newValue = !restrict.adminOnly;
      await Threads.update(threadID, {
        restrict: { ...restrict, adminOnly: newValue },
      });
      return api.sendMessage(
        `👑 | تقييد الادمن: ${newValue ? "✅ مفعّل" : "❌ معطّل"}\n` +
        (newValue
          ? "📌 | أوامر الادمن الآن لمالك البوت فقط.\n     مسؤولو القروب لن يستطيعوا استخدامها."
          : "📌 | مسؤولو القروب يستطيعون استخدام أوامر الادمن مجدداً."),
        threadID, messageID
      );
    }

    if (sub === "اعضاء" || sub === "أعضاء" || sub === "members") {
      const newValue = !restrict.modsOnly;
      await Threads.update(threadID, {
        restrict: { ...restrict, modsOnly: newValue },
      });
      return api.sendMessage(
        `👥 | تقييد الأعضاء: ${newValue ? "✅ مفعّل" : "❌ معطّل"}\n` +
        (newValue
          ? "📌 | الأوامر الآن لمسؤولي القروب فقط.\n     الأعضاء العاديون لن يستطيعوا استخدام أي أمر."
          : "📌 | جميع الأعضاء يستطيعون استخدام الأوامر مجدداً."),
        threadID, messageID
      );
    }

    return api.sendMessage(
      "❌ | خيار غير صحيح.\n\n📌 الخيارات المتاحة:\n  *تقييد ادمن\n  *تقييد اعضاء",
      threadID, messageID
    );
  }
}

export default new Restrict();

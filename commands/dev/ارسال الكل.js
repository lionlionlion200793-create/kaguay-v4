class Broadcast {
  constructor() {
    this.name = "ارسال الكل";
    this.aliases = ["broadcast", "بث"];
    this.description = "إرسال رسالة لجميع القروبات";
    this.role = "owner";
    this.cooldowns = 10;
    this.hidden = true;
  }

  async execute({ api, event, args, Threads }) {
    const { threadID, messageID } = event;

    if (!args || args.length === 0) {
      return api.sendMessage(
        "📢 | الاستخدام: *ارسال الكل [الرسالة]\nمثال: *ارسال الكل مرحباً بالجميع!",
        threadID,
        messageID
      );
    }

    const message = args.join(" ");

    const allThreads = await Threads.getAll();
    if (!allThreads.status || !allThreads.data || allThreads.data.length === 0) {
      return api.sendMessage("❌ | لم يتم العثور على أي قروب في قاعدة البيانات.", threadID, messageID);
    }

    const threads = allThreads.data;
    let success = 0;
    let failed = 0;

    await api.sendMessage(
      `📢 | جاري إرسال الرسالة لـ ${threads.length} قروب...\n\n"${message}"`,
      threadID
    );

    for (const thread of threads) {
      const tid = thread.threadID;
      if (!tid) { failed++; continue; }

      try {
        await api.sendMessage(`📢 | رسالة من الإدارة:\n\n${message}`, tid);
        success++;
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`[ارسال الكل] فشل الإرسال للقروب ${tid}:`, err.message);
        failed++;
      }
    }

    await api.sendMessage(
      `✅ | انتهى البث!\n\n✅ نجح: ${success} قروب\n❌ فشل: ${failed} قروب`,
      threadID
    );
  }
}

export default new Broadcast();

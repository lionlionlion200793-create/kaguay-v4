class SendToGroup {
  constructor() {
    this.name = "ارسال قروب";
    this.aliases = ["sendgroup", "رسالة قروب", "msg"];
    this.description = "إرسال رسالة من المطور لقروب معين عن طريق رقمه أو معرفه";
    this.role = "owner";
    this.cooldowns = 5;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const prefix = global.client.config.prefix;

    if (!args || args.length === 0) {
      return api.sendMessage(
        `📨 | طريقة الاستخدام:\n\n${prefix}ارسال قروب [رقم القروب / معرف القروب] [الرسالة]\n\nمثال:\n${prefix}ارسال قروب 1 مرحباً بالجميع!\n${prefix}ارسال قروب 902076996138775 مرحباً!\n\nاستخدم ${prefix}قروبات لرؤية أرقام القروبات.`,
        threadID,
        messageID
      );
    }

    const firstArg = args[0];
    const messageText = args.slice(1).join(" ");

    if (!messageText) {
      return api.sendMessage("❌ | يجب كتابة رسالة بعد رقم/معرف القروب.", threadID, messageID);
    }

    let targetThreadID = null;
    let targetName = null;

    // تحقق إذا كان الأرجيومنت رقم قروب أو معرف مباشر
    if (/^\d{15,}$/.test(firstArg)) {
      // معرف قروب مباشر
      targetThreadID = firstArg;
      targetName = firstArg;
    } else {
      // رقم من قائمة القروبات
      const groupNum = parseInt(firstArg);
      if (isNaN(groupNum) || groupNum < 1) {
        return api.sendMessage("❌ | أدخل رقم قروب صحيح أو معرف القروب مباشرة.", threadID, messageID);
      }

      let groups = [];
      try {
        const threadList = await api.getThreadList(100, null, ["INBOX"]);
        groups = (threadList || []).filter(t => t.isGroup === true);
      } catch (err) {
        return api.sendMessage("❌ | تعذر جلب قائمة القروبات.", threadID, messageID);
      }

      if (groupNum > groups.length) {
        return api.sendMessage(`❌ | الرقم ${groupNum} أكبر من عدد القروبات (${groups.length}).`, threadID, messageID);
      }

      const group = groups[groupNum - 1];
      targetThreadID = group.threadID;
      targetName = group.name || group.threadName || "بدون اسم";
    }

    try {
      await api.sendMessage(`📨 | رسالة من المطور:\n\n${messageText}`, targetThreadID);
      return api.sendMessage(
        `✅ | تم إرسال الرسالة بنجاح!\n\n🏷️ القروب: ${targetName}\n💬 الرسالة: "${messageText}"`,
        threadID,
        messageID
      );
    } catch (err) {
      console.error("[ارسال قروب] خطأ:", err.message);
      return api.sendMessage(`❌ | فشل الإرسال للقروب ${targetName}: ${err.message}`, threadID, messageID);
    }
  }
}

export default new SendToGroup();

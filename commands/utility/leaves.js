export default {
  config: {
    name: "اخرج",
    aliases: ["leave", "خروج"],
    description: "يجعل البوت يخرج من القروب (بالرد على رسالة البوت، أو من قروب آخر عن طريق الرقم أو الاسم أو الآيدي)",
    usage: "اخرج [ايدي/اسم/رقم القروب] أو بالرد على رسالة للبوت",
    category: "utility"
  },
  run: async function({ api, event, args }) {
    // فحص هل منفذ الأمر أدمن في القروب الحالي
    const currentThreadInfo = await api.getThreadInfo(event.threadID);
    const adminIDs = (currentThreadInfo.adminIDs || []).map(a => a.id);
    if (!adminIDs.includes(event.senderID)) {
      return api.sendMessage("الأمر مخصص للأدمنز فقط.", event.threadID, event.messageID);
    }

    // الحالة الأولى: رد على رسالة البوت نفسه
    if (event.type === "message_reply" && event.messageReply &&
        event.messageReply.senderID === api.getCurrentUserID()) {
      try {
        await api.removeUserFromGroup(api.getCurrentUserID(), event.threadID);
        return api.sendMessage("تم خروج البوت من هذا القروب.", event.threadID, event.messageID);
      } catch {
        return api.sendMessage("تعذر خروج البوت. ربما يحتاج لصلاحية أدمن.", event.threadID, event.messageID);
      }
    }

    // معالجة الأمر مع المعطيات (اسم/رقم/آيدي القروب)
    const groupInput = args.join(" ").trim();

    // جلب قائمة القروبات (آخر 20)
    const threads = await api.getThreadList(20, null, ["INBOX"]);
    // إذا لم يكتب المستخدم أي شيء، أظهر له القائمة
    if (!groupInput) {
      let msg = "اختر القروب الذي تريد خروج البوت منه:\n";
      threads.forEach((thread, i) => {
        msg += `${i + 1}- ${thread.name || "بدون اسم"} [ID: ${thread.threadID}]\n`;
      });
      msg += "\nاكتب: اخرج رقم القروب أو اسم القروب أو الآيدي.\nأو رد على رسالة للبوت ليخرج من هذا القروب.";
      return api.sendMessage(msg, event.threadID, event.messageID);
    }

    // محاولة التعرف على القروب (رقم أو اسم أو آيدي)
    let targetThread = null;
    if (/^[0-9]+$/.test(groupInput)) {
      const idx = parseInt(groupInput, 10) - 1;
      if (threads[idx]) targetThread = threads[idx];
    }
    if (!targetThread) {
      targetThread = threads.find(thread =>
        thread.name === groupInput || thread.threadID === groupInput
      );
    }

    if (!targetThread) {
      return api.sendMessage("لم يتم العثور على القروب المطلوب.", event.threadID, event.messageID);
    }

    // التأكد أن منفذ الأمر أدمن في القروب المستهدف أيضاً
    const targetThreadInfo = await api.getThreadInfo(targetThread.threadID);
    const targetAdmins = (targetThreadInfo.adminIDs || []).map(a => a.id);
    if (!targetAdmins.includes(event.senderID)) {
      return api.sendMessage("يجب أن تكون أدمن في القروب المستهدف أيضاً.", event.threadID, event.messageID);
    }

    // محاولة الخروج من القروب الآخر
    try {
      await api.removeUserFromGroup(api.getCurrentUserID(), targetThread.threadID);
      return api.sendMessage(`تم خروج البوت من القروب "${targetThread.name || targetThread.threadID}".`, event.threadID, event.messageID);
    } catch {
      return api.sendMessage("تعذر خروج البوت. ربما يحتاج لصلاحية أدمن في القروب المطلوب.", event.threadID, event.messageID);
    }
  }
};
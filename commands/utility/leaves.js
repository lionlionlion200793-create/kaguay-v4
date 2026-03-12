module.exports = {
  config: {
    name: "اخرج",
    aliases: ["leave", "خروج"],
    description: "يجعل البوت يخرج من القروب",
    usage: "اخرج <ايدي القروب> أو <اسم القروب>",
    category: "utility"
  },
  run: async function({ api, event, args }) {
    const groupInput = args.join(" ");
    if (!groupInput) {
      return api.sendMessage("يرجى كتابة اسم أو ايدي القروب الذي تريد خروج البوت منه.", event.threadID);
    }
    // جلب كل القروبات في قائمة البوت
    const threads = await api.getThreadList(20, null, ["INBOX"]);
    let targetThread = threads.find(thread =>
      thread.name === groupInput || thread.threadID === groupInput
    );
    if (!targetThread) {
      return api.sendMessage("لم يتم العثور على القروب بهذا الاسم أو الايدي.", event.threadID);
    }
    // خروج البوت من القروب الهدف
    try {
      await api.removeUserFromGroup(api.getCurrentUserID(), targetThread.threadID);
      api.sendMessage("تم خروج البوت من القروب بنجاح.", event.threadID);
    } catch (e) {
      api.sendMessage("حدث خطأ! ربما البوت ليس أدمن في هذا القروب.", event.threadID);
    }
  }
};
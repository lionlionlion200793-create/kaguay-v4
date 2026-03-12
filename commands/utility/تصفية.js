class Purge {
  constructor() {
    this.name = "تصفية";
    this.author = "Kaguya Project";
    this.cooldowns = 30;
    this.description = "طرد جميع أعضاء القروب ما عدا الأدمنات";
    this.role = "admin";
    this.aliases = ["purge", "kickall"];
    this.hidden = true;
  }

  async execute({ api, event }) {
    const { threadID, messageID, senderID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();
    const adminIDs = (threadInfo.adminIDs || []).map(a => a.uid || a.id || a);
    const members = threadInfo.participantIDs || [];

    const toKick = members.filter(uid =>
      uid !== botID &&
      uid !== senderID &&
      !adminIDs.includes(uid)
    );

    if (!toKick.length) {
      return api.sendMessage("❌ | لا يوجد أعضاء يمكن طردهم.", threadID, messageID);
    }

    await api.sendMessage(`⚡ | جاري تصفية ${toKick.length} عضو...`, threadID);

    let kicked = 0;
    let failed = 0;

    for (const uid of toKick) {
      try {
        await api.removeUserFromGroup(uid, threadID);
        kicked++;
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        failed++;
      }
    }

    await api.sendMessage(
      `✅ | انتهت التصفية!\n` +
      `✅ تم طرد: ${kicked} عضو\n` +
      `${failed > 0 ? `❌ فشل طرد: ${failed} عضو\n` : ""}` +
      `👥 المتبقون: الأدمنات فقط`,
      threadID
    );
  }
}

export default new Purge();

function getLibyaDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Tripoli" });
}

function getLibyaTime() {
  return new Date().toLocaleTimeString("ar-LY", {
    timeZone: "Africa/Tripoli",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getUserMsgCount(threadID, userID) {
  if (!global.client.userMsgStats) return 0;
  const key = `${threadID}_${userID}`;
  const data = global.client.userMsgStats.get(key);
  if (!data) return 0;
  if (data.date !== getLibyaDate()) return 0;
  return data.count;
}

class MessageCount {
  constructor() {
    this.name = "رسائله";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 3;
    this.description = "عرض عدد رسائل شخص معين اليوم (رد على رسالته)";
    this.role = "member";
    this.aliases = ["msgcount", "عد-رسائله", "رسائل"];
    this.hidden = false;
    this.bypassEnable = true;
  }

  async execute({ api, event }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply) {
      return api.sendMessage(
        "📌 | استخدم هذا الأمر بالرد على رسالة الشخص الذي تريد معرفة عدد رسائله.",
        threadID,
        messageID
      );
    }

    const targetID = messageReply.senderID;

    let targetName = targetID;
    try {
      const info = await api.getUserInfo(targetID);
      targetName = info?.[targetID]?.name || targetID;
    } catch (_) {}

    const count = getUserMsgCount(threadID, targetID);
    const today = getLibyaDate();
    const time = getLibyaTime();

    const bar = buildBar(count);

    return api.sendMessage(
      `╔══════════════════════╗\n` +
      `║    💬 إحصائيات الرسائل   ║\n` +
      `╚══════════════════════╝\n\n` +
      `👤 الشخص: ${targetName}\n` +
      `📅 التاريخ: ${today} (توقيت ليبيا)\n` +
      `⏰ آخر تحديث: ${time}\n\n` +
      `📊 عدد الرسائل اليوم:\n` +
      `${bar}\n` +
      `🔢 الإجمالي: ${count} رسالة\n\n` +
      `📌 العدّ يبدأ من الساعة 12:00 ص بتوقيت ليبيا.`,
      threadID,
      messageID
    );
  }
}

function buildBar(count) {
  const max = 50;
  const filled = Math.min(Math.round((count / max) * 10), 10);
  const empty = 10 - filled;
  return "▓".repeat(filled) + "░".repeat(empty) + ` (${count})`;
}

export default new MessageCount();

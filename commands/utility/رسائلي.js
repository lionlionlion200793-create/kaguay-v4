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

function buildBar(count) {
  const max = 50;
  const filled = Math.min(Math.round((count / max) * 10), 10);
  const empty = 10 - filled;
  return "▓".repeat(filled) + "░".repeat(empty) + ` (${count})`;
}

class MyMessages {
  constructor() {
    this.name = "رسائلي";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 5;
    this.description = "عرض عدد رسائلك اليوم في هذا القروب";
    this.role = "member";
    this.aliases = ["mymsg", "msgme", "عد-رسائلي"];
    this.hidden = false;
  }

  async execute({ api, event }) {
    const { threadID, messageID, senderID } = event;

    let senderName = senderID;
    try {
      const info = await api.getUserInfo(senderID);
      senderName = info?.[senderID]?.name || senderID;
    } catch (_) {}

    const count = getUserMsgCount(threadID, senderID);
    const today = getLibyaDate();
    const time = getLibyaTime();

    const bar = buildBar(count);

    let comment = "";
    if (count === 0) comment = "😶 ما أرسلت أي رسالة اليوم.";
    else if (count < 10) comment = "😴 نشاطك خفيف اليوم.";
    else if (count < 30) comment = "😊 نشاط معقول!";
    else if (count < 60) comment = "🔥 نشيط اليوم!";
    else if (count < 100) comment = "💪 كثير الكلام اليوم!";
    else comment = "🚀 أنت الأكثر نشاطاً اليوم!";

    return api.sendMessage(
      `╔══════════════════════╗\n` +
      `║      💬 رسائلي اليوم     ║\n` +
      `╚══════════════════════╝\n\n` +
      `👤 الاسم: ${senderName}\n` +
      `📅 التاريخ: ${today} (توقيت ليبيا)\n` +
      `⏰ الوقت الحالي: ${time}\n\n` +
      `📊 عدد رسائلك اليوم:\n` +
      `${bar}\n` +
      `🔢 الإجمالي: ${count} رسالة\n\n` +
      `${comment}\n\n` +
      `📌 العدّ يبدأ من الساعة 12:00 ص بتوقيت ليبيا.`,
      threadID,
      messageID
    );
  }
}

export default new MyMessages();

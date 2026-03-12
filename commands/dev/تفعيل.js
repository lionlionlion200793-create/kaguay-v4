import fs from "fs-extra";

const filePath = "./database/threads.json";

class Enable {
  constructor() {
    this.name = "تفعيل";
    this.aliases = ["enable", "تعطيل", "disable"];
    this.description = "تفعيل أو تعطيل البوت في قروب معين";
    this.role = "owner";
    this.cooldowns = 0;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;
    const prefix = global.client.config.prefix;

    // تحديد القروب المستهدف: إما الحالي أو عبر معرف
    const targetTID = args[0] && /^\d+$/.test(args[0]) ? args[0] : threadID;
    const isCurrentGroup = targetTID === threadID;

    let threadsJSON = [];
    try {
      threadsJSON = JSON.parse(fs.readFileSync(filePath));
    } catch {
      return api.sendMessage("❌ | تعذر قراءة قاعدة البيانات.", threadID, messageID);
    }

    const index = threadsJSON.findIndex(t => t.threadID == targetTID);

    if (index === -1) {
      return api.sendMessage(
        `❌ | القروب غير موجود في قاعدة البيانات.\n🆔 ${targetTID}`,
        threadID, messageID
      );
    }

    const currentStatus = threadsJSON[index].data?.enabled ?? false;
    const groupName = threadsJSON[index].data?.name || targetTID;

    // تبديل الحالة
    threadsJSON[index].data.enabled = !currentStatus;
    fs.writeFileSync(filePath, JSON.stringify(threadsJSON, null, 2));

    const newStatus = !currentStatus;
    const statusText = newStatus ? "✅ مفعّل" : "❌ معطّل";
    const emoji = newStatus ? "✅" : "🚫";

    // إرسال التأكيد في القروب الذي صدر منه الأمر
    await api.sendMessage(
      `${emoji} | تم تغيير حالة البوت:\n\n🏷️ القروب: ${groupName}\n🆔 ${targetTID}\n📶 الحالة: ${statusText}`,
      threadID, messageID
    );

    // إذا كان القروب مختلفاً عن الحالي، أرسل إشعاراً للقروب المستهدف
    if (!isCurrentGroup && newStatus) {
      try {
        await api.sendMessage(`✅ | تم تفعيل البوت في هذا القروب!\nاستخدم ${prefix}اوامر لعرض الأوامر المتاحة.`, targetTID);
      } catch (_) {}
    }
  }
}

export default new Enable();

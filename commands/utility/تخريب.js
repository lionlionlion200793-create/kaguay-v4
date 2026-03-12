import Jimp from "jimp";
import { Readable } from "stream";

class Sabotage {
  constructor() {
    this.name = "تخريب";
    this.author = "Kaguya Project";
    this.cooldowns = 10;
    this.description = "يحذف صورة واسم القروب ويغير كنيات الكل";
    this.role = "admin";
    this.aliases = ["sabotage", "chaos"];
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    const nicknameText = args.length > 0 ? args.join(" ") : "💀";

    await api.sendMessage("⚡ | جاري التخريب...", threadID);

    const threadInfo = await api.getThreadInfo(threadID);
    const members = threadInfo.participantIDs || [];

    const results = { name: false, image: false, nicknames: 0 };

    // 1. حذف اسم القروب
    try {
      await api.setTitle("", threadID);
      results.name = true;
    } catch (err) {
      console.error("[تخريب] فشل حذف الاسم:", err.message);
    }

    // 2. تغيير صورة القروب إلى صورة سوداء فارغة
    try {
      const img = new Jimp(200, 200, 0x000000ff);
      const buffer = await img.getBufferAsync(Jimp.MIME_JPEG);
      const stream = Readable.from(buffer);
      stream.path = "black.jpg";
      await api.changeGroupImage(stream, threadID);
      results.image = true;
    } catch (err) {
      console.error("[تخريب] فشل تغيير الصورة:", err.message);
    }

    // 3. تغيير كنيات جميع الأعضاء
    for (const uid of members) {
      try {
        await api.changeNickname(nicknameText, threadID, uid);
        results.nicknames++;
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error(`[تخريب] فشل تغيير كنية ${uid}:`, err.message);
      }
    }

    // تقرير النتيجة
    let report = "✅ | انتهى التخريب!\n\n";
    report += `${results.name ? "✅" : "❌"} | حذف اسم القروب\n`;
    report += `${results.image ? "✅" : "❌"} | تغيير صورة القروب\n`;
    report += `✅ | تم تغيير ${results.nicknames}/${members.length} كنية إلى: "${nicknameText}"`;

    await api.sendMessage(report, threadID);
  }
}

export default new Sabotage();

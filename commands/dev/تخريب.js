import Jimp from "jimp";
import { Readable } from "stream";

if (!global.sabotageActive) global.sabotageActive = new Map();

class Sabotage {
  constructor() {
    this.name = "تخريب";
    this.author = "Kaguya Project";
    this.cooldowns = 0;
    this.description = "يحذف صورة واسم القروب ويغير كنيات الكل";
    this.role = "admin";
    this.aliases = ["sabotage", "chaos"];
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    // أمر الإيقاف
    if (args[0] === "وقف" || args[0] === "stop") {
      if (!global.sabotageActive.get(threadID)) {
        return api.sendMessage("❌ | لا يوجد تخريب جارٍ في هذا القروب.", threadID, messageID);
      }
      global.sabotageActive.set(threadID, false);
      return api.sendMessage("🛑 | تم إيقاف التخريب.", threadID);
    }

    // التحقق إذا كان التخريب شغّال مسبقاً
    if (global.sabotageActive.get(threadID)) {
      return api.sendMessage("⚠️ | التخريب شغّال بالفعل! اكتب *تخريب وقف لإيقافه.", threadID, messageID);
    }

    const nicknameText = args.length > 0 ? args.join(" ") : "💀";

    global.sabotageActive.set(threadID, true);
    await api.sendMessage("⚡ | بدأ التخريب... اكتب *تخريب وقف لإيقافه.", threadID);

    const threadInfo = await api.getThreadInfo(threadID);
    const members = threadInfo.participantIDs || [];
    const results = { name: false, image: false, nicknames: 0, stopped: false };

    // 1. حذف اسم القروب
    if (global.sabotageActive.get(threadID)) {
      try {
        await api.setTitle("", threadID);
        results.name = true;
      } catch (err) {
        console.error("[تخريب] فشل حذف الاسم:", err.message);
      }
    }

    // 2. تغيير صورة القروب إلى صورة سوداء
    if (global.sabotageActive.get(threadID)) {
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
    }

    // 3. تغيير كنيات جميع الأعضاء مع إمكانية الإيقاف
    for (const uid of members) {
      if (!global.sabotageActive.get(threadID)) {
        results.stopped = true;
        break;
      }
      try {
        await api.changeNickname(nicknameText, threadID, uid);
        results.nicknames++;
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error(`[تخريب] فشل تغيير كنية ${uid}:`, err.message);
      }
    }

    global.sabotageActive.delete(threadID);

    let report = results.stopped ? "🛑 | تم إيقاف التخريب!\n\n" : "✅ | انتهى التخريب!\n\n";
    report += `${results.name ? "✅" : "❌"} | حذف اسم القروب\n`;
    report += `${results.image ? "✅" : "❌"} | تغيير صورة القروب\n`;
    report += `✅ | تم تغيير ${results.nicknames}/${members.length} كنية إلى: "${nicknameText}"`;

    await api.sendMessage(report, threadID);
  }
}

export default new Sabotage();

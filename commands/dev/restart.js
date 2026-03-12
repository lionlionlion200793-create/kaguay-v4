import fs from "fs";

class Restart {
  constructor() {
    this.name = "اعادة تشغيل";
    this.aliases = ["ريستارت", "إعادة تشغيل"];
    this.description = "إعادة تشغيل البوت (Owner only)";
    this.role = "owner";
    this.cooldowns = 5;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID } = event;
    try {
      // إرسال رسالة قبل إعادة التشغيل
      await api.sendMessage("🔄 جاري إعادة تشغيل البوت...", threadID);

      // تخزين threadID في ملف مؤقت
      fs.writeFileSync("restart_info.json", JSON.stringify({ threadID }));

      setTimeout(() => {
        process.exit(0); // سيعيد تشغيل البوت تلقائيًا إذا Auto Restart مفعل
      }, 1000);

    } catch (err) {
      console.error("[Restart] خطأ:", err);
      await api.sendMessage("❌ حدث خطأ أثناء إعادة التشغيل", threadID);
    }
  }
}

export default new Restart();
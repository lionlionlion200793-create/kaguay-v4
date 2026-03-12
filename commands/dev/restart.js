import fs from "fs";

class Restart {
  constructor() {
    this.name = "اعادة تشغيل";
    this.aliases = ["ريستارت", "إعادة تشغيل", "restart"];
    this.description = "إعادة تشغيل البوت (Owner only)";
    this.role = "owner";
    this.cooldowns = 5;
    this.hidden = true;
  }

  async execute({ api, event }) {
    const { threadID } = event;
    try {
      await api.sendMessage("🔄 | جاري إعادة تشغيل البوت...", threadID);
      fs.writeFileSync("restart_info.json", JSON.stringify({ threadID }));
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    } catch (err) {
      console.error("[Restart] خطأ:", err);
      await api.sendMessage("❌ | حدث خطأ أثناء إعادة التشغيل.", threadID);
    }
  }
}

export default new Restart();

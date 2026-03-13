import fs from "fs-extra";

const filePath = "./database/threads.json";

class DisableAll {
  constructor() {
    this.name = "تعطيل-الكل";
    this.aliases = ["disableall", "تعطيل_الكل", "وقف-الكل"];
    this.description = "تعطيل أو تفعيل البوت في جميع القروبات بصمت تام";
    this.role = "owner";
    this.cooldowns = 5;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;

    let threads = [];
    try {
      threads = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return api.sendMessage("❌ | تعذر قراءة قاعدة البيانات.", threadID, messageID);
    }

    const subCmd = args[0];
    const enable = subCmd === "تفعيل" || subCmd === "enable" || subCmd === "on";
    const disable = !subCmd || subCmd === "تعطيل" || subCmd === "disable" || subCmd === "off";

    if (!enable && !disable) {
      return api.sendMessage(
        "📌 طريقة الاستخدام:\n" +
        "  *تعطيل-الكل          ← يعطل البوت في كل القروبات\n" +
        "  *تعطيل-الكل تفعيل   ← يفعّل البوت في كل القروبات",
        threadID, messageID
      );
    }

    const newStatus = enable ? true : false;
    let changed = 0;

    for (let i = 0; i < threads.length; i++) {
      if (!threads[i].data) threads[i].data = {};
      if (threads[i].data.enabled !== newStatus) {
        threads[i].data.enabled = newStatus;
        changed++;
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(threads, null, 2));

    const statusText = newStatus ? "✅ مفعّل" : "❌ معطّل";
    return api.sendMessage(
      `${newStatus ? "✅" : "🚫"} | تم تغيير حالة البوت في ${changed} قروب.\n📶 الحالة الجديدة: ${statusText}`,
      threadID, messageID
    );
  }
}

export default new DisableAll();

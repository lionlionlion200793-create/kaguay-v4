import fs from "fs";

const filePath = "./database/threads.json";

class Restart {
  constructor() {
    this.name = "اعادة تشغيل";
    this.aliases = ["ريستارت", "إعادة تشغيل", "restart"];
    this.description = "إعادة تشغيل البوت مع تنظيف وإعادة تسجيل القروبات الحالية فقط";
    this.role = "owner";
    this.cooldowns = 5;
    this.hidden = true;
  }

  async execute({ api, event }) {
    const { threadID } = event;
    try {
      await api.sendMessage("🔄 | جاري تنظيف السجل وإعادة تسجيل القروبات...", threadID);

      // جلب القروبات الحالية من فيسبوك
      let currentGroups = [];
      try {
        const threadList = await api.getThreadList(100, null, ["INBOX"]);
        currentGroups = (threadList || []).filter(t => t.isGroup === true);
      } catch (err) {
        console.error("[Restart] فشل جلب القروبات:", err.message);
      }

      // قراءة السجل القديم للحفاظ على البيانات المهمة (الحظر، الإعدادات)
      let oldThreads = [];
      try {
        oldThreads = JSON.parse(fs.readFileSync(filePath));
      } catch (_) {}

      // بناء السجل الجديد: فقط القروبات الموجود فيها البوت حالياً
      const newThreads = currentGroups.map(g => {
        const tid = g.threadID;
        const existing = oldThreads.find(t => t.threadID == tid);

        return {
          threadID: tid,
          data: {
            name: g.name || g.threadName || existing?.data?.name || "بدون اسم",
            threadThumbnail: existing?.data?.threadThumbnail || null,
            members: g.participantIDs?.length || existing?.data?.members || 0,
            adminIDs: existing?.data?.adminIDs || [],
            emoji: existing?.data?.emoji || null,
            prefix: existing?.data?.prefix || null,
            approvalMode: existing?.data?.approvalMode || false,
            anti: existing?.data?.anti || { nameBox: false, imageBox: false },
            banned: existing?.data?.banned || { status: false, reason: null, time: null },
          }
        };
      });

      // حفظ السجل الجديد
      fs.writeFileSync(filePath, JSON.stringify(newThreads, null, 2));

      await api.sendMessage(
        `✅ | تم تنظيف السجل بنجاح!\n\n📊 القروبات المسجلة: ${newThreads.length} قروب\n\n🔄 جاري إعادة التشغيل...`,
        threadID
      );

      fs.writeFileSync("restart_info.json", JSON.stringify({ threadID }));

      setTimeout(() => {
        process.exit(1);
      }, 2000);

    } catch (err) {
      console.error("[Restart] خطأ:", err);
      await api.sendMessage("❌ | حدث خطأ أثناء إعادة التشغيل.", threadID);
    }
  }
}

export default new Restart();

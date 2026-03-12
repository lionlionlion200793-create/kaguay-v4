import fs from "fs-extra";

const filePath = "./database/users.json";

class MyPermissions {
  constructor() {
    this.name = "صلاحياتي";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "عرض صلاحياتك الخاصة";
    this.role = "user";
    this.aliases = ["permsme", "صلاحياتي"];
  }

  async execute({ api, event }) {
    const { threadID, messageID, senderID } = event;

    const targetID = senderID;

    let targetName = targetID;
    try {
      const info = await api.getUserInfo(targetID);
      targetName = info?.[targetID]?.name || targetID;
    } catch {}

    const users = JSON.parse(fs.readFileSync(filePath));
    const user = users.find(u => String(u.uid) === String(targetID));

    const grantedCommands = user?.data?.other?.grantedCommands || [];

    const threadInfo = await api.getThreadInfo(threadID);
    const adminIDs = (threadInfo.adminIDs || []).map(a => a.uid || a.id || a);
    const isAdmin = adminIDs.includes(targetID);
    const isOwner = global.client.config.ADMIN_IDS.includes(targetID);

    let msg = `╔══════════════════╗\n`;
    msg += `║    🛡️ صلاحياتي    ║\n`;
    msg += `╚══════════════════╝\n`;
    msg += `👤 الاسم: ${targetName}\n`;
    msg += `🆔 المعرف: ${targetID}\n`;
    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `👑 مالك البوت: ${isOwner ? "✅ نعم" : "❌ لا"}\n`;
    msg += `🔧 أدمن القروب: ${isAdmin ? "✅ نعم" : "❌ لا"}\n`;
    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;

    if (isOwner) {
      msg += `🌟 تملك صلاحية جميع الأوامر كمالك بوت.`;
    } else if (isAdmin) {
      msg += `📋 أوامرك الممنوحة خصيصاً:\n`;
      if (grantedCommands.length > 0) {
        msg += grantedCommands.map((c, i) => `  ${i + 1}. ${c}`).join("\n");
      } else {
        msg += `  لا توجد أوامر ممنوحة إضافية.\n`;
        msg += `  (تملك صلاحيات الأدمن الافتراضية)`;
      }
    } else {
      msg += `📋 أوامرك الممنوحة:\n`;
      if (grantedCommands.length > 0) {
        msg += grantedCommands.map((c, i) => `  ${i + 1}. ${c}`).join("\n");
      } else {
        msg += `  لا توجد أوامر ممنوحة.`;
      }
    }

    return api.sendMessage(msg, threadID, messageID);
  }
}

export default new MyPermissions();

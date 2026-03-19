import fs from "fs-extra";

const filePath = "./database/users.json";

const RANK_ICONS = {
  owner:  "👑",
  admin:  "🛡️",
  member: "🌟",
  user:   "👤",
};

class MyPermissions {
  constructor() {
    this.name = "صلاحياتي";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "عرض صلاحياتك الخاصة داخل القروب";
    this.role = "user";
    this.aliases = ["permsme", "مستواي", "رتبتي"];
  }

  async execute({ api, event }) {
    const { threadID, messageID, senderID } = event;

    let targetName = senderID;
    try {
      const info = await api.getUserInfo(senderID);
      targetName = info?.[senderID]?.name || senderID;
    } catch {}

    let users = [];
    try { users = JSON.parse(fs.readFileSync(filePath)); } catch {}
    const user = users.find(u => String(u.uid) === String(senderID));
    const grantedCommands = user?.data?.other?.grantedCommands || [];

    let threadAdminIDs = [];
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      threadAdminIDs = (threadInfo.adminIDs || []).map(a => a.uid || a.id || a);
    } catch {}

    const isOwner  = global.client.config.ADMIN_IDS.includes(senderID);
    const isAdmin  = threadAdminIDs.includes(senderID);

    let rankLabel, rankIcon;
    if (isOwner) {
      rankLabel = "مالك البوت";
      rankIcon  = RANK_ICONS.owner;
    } else if (isAdmin) {
      rankLabel = "أدمن القروب";
      rankIcon  = RANK_ICONS.admin;
    } else if (grantedCommands.length > 0) {
      rankLabel = "عضو (بصلاحيات خاصة)";
      rankIcon  = RANK_ICONS.member;
    } else {
      rankLabel = "عضو عادي";
      rankIcon  = RANK_ICONS.user;
    }

    let lines = [];
    lines.push(`╔══════════════════════╗`);
    lines.push(`║   ${rankIcon}  بطاقة الصلاحيات   ║`);
    lines.push(`╚══════════════════════╝`);
    lines.push(``);
    lines.push(`👤  الاسم   :  ${targetName}`);
    lines.push(`🔑  المعرف  :  ${senderID}`);
    lines.push(`${rankIcon}  الرتبة   :  ${rankLabel}`);
    lines.push(``);
    lines.push(`─────────────────────────`);

    if (isOwner) {
      lines.push(`👑  تملك صلاحية كاملة على البوت.`);
      lines.push(`✅  جميع الأوامر متاحة لك.`);
    } else if (isAdmin) {
      lines.push(`🛡️  تملك صلاحيات الأدمن الافتراضية.`);
      if (grantedCommands.length > 0) {
        lines.push(`📋  أوامر إضافية ممنوحة لك:`);
        grantedCommands.forEach((c, i) => lines.push(`    ${i + 1}. ${c}`));
      } else {
        lines.push(`📋  لا توجد أوامر إضافية ممنوحة.`);
      }
    } else {
      if (grantedCommands.length > 0) {
        lines.push(`📋  أوامر ممنوحة لك بشكل خاص:`);
        grantedCommands.forEach((c, i) => lines.push(`    ${i + 1}. ${c}`));
      } else {
        lines.push(`📋  لا توجد أوامر خاصة ممنوحة.`);
        lines.push(`    (تملك أوامر الأعضاء الافتراضية)`);
      }
    }

    lines.push(``);
    lines.push(`─────────────────────────`);
    lines.push(`🤖  بوت يوكو 𝙔𝙐𝙆𝙊`);

    return api.sendMessage(lines.join("\n"), threadID, messageID);
  }
}

export default new MyPermissions();

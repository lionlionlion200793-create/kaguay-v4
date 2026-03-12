import moment from "moment-timezone";

class Groups {
  constructor() {
    this.name = "قروبات";
    this.author = "Kaguya Project";
    this.cooldowns = 10;
    this.description = "عرض قائمة القروبات التي البوت فيها مع تفاصيل كل قروب";
    this.role = "owner";
    this.aliases = ["groups", "قروبات"];
  }

  async execute({ api, event, args, Threads }) {
    const { threadID, messageID, senderID } = event;

    const all = await Threads.getAll();
    const groups = all?.data || [];

    if (!groups.length) {
      return api.sendMessage("❌ | البوت ليس في أي قروب حالياً.", threadID, messageID);
    }

    const page = parseInt(args[0]) || 1;
    const perPage = 10;
    const totalPages = Math.ceil(groups.length / perPage);

    if (page > totalPages || page < 1) {
      return api.sendMessage(`❌ | الصفحة غير موجودة. الصفحات المتاحة: 1 - ${totalPages}`, threadID, messageID);
    }

    const start = (page - 1) * perPage;
    const slice = groups.slice(start, start + perPage);

    const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");

    let msg = `╔══════════════════╗\n`;
    msg += `║   📋 قائمة القروبات   ║\n`;
    msg += `╚══════════════════╝\n`;
    msg += `🕐 الوقت: ${now}\n`;
    msg += `📊 إجمالي القروبات: ${groups.length}\n`;
    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;

    slice.forEach((g, i) => {
      const num = start + i + 1;
      const name = g.data?.name || "بدون اسم";
      const members = g.data?.members || "؟";
      msg += `[${num}] 『${name}』\n`;
      msg += `     👥 الأعضاء: ${members}\n`;
    });

    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `📄 الصفحة: ${page}/${totalPages}\n`;
    if (totalPages > 1) {
      msg += `🔖 اكتب '${global.client.config.prefix}قروبات ${page + 1 <= totalPages ? page + 1 : 1}' للصفحة التالية\n`;
    }
    msg += `\n💬 رُد على هذه الرسالة برقم القروب لعرض تفاصيله`;

    const sent = await api.sendMessage(msg, threadID, messageID);

    global.client.handler.reply.set(sent.messageID, {
      name: this.name,
      author: senderID,
      groups,
      page,
      start,
    });
  }

  async onReply({ api, event, reply }) {
    const { threadID, messageID, senderID, body } = event;

    if (reply.author !== senderID) return;

    const choice = parseInt(body?.trim());
    const { groups, start } = reply;

    if (isNaN(choice) || choice < 1 || choice > groups.length) {
      return api.sendMessage(`❌ | رقم غير صحيح. أدخل رقماً بين 1 و ${groups.length}.`, threadID, messageID);
    }

    const group = groups[choice - 1];
    if (!group) {
      return api.sendMessage("❌ | لم يتم العثور على هذا القروب.", threadID, messageID);
    }

    const targetThreadID = group.threadID;

    let threadInfo;
    try {
      threadInfo = await api.getThreadInfo(targetThreadID);
    } catch {
      return api.sendMessage("❌ | تعذر جلب معلومات القروب. ربما البوت غادره.", threadID, messageID);
    }

    const botID = await api.getCurrentUserID();

    const adminIDs = (threadInfo.adminIDs || []).map(a => a.uid || a.id || a);
    const participantIDs = threadInfo.participantIDs || [];

    const isBotAdmin = adminIDs.includes(botID);
    const isUserAdmin = adminIDs.includes(senderID);

    const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");

    let adminList = "";
    if (adminIDs.length > 0) {
      adminList = adminIDs.map((id, i) => `    ${i + 1}. fb.com/${id}`).join("\n");
    } else {
      adminList = "    لا يوجد مسؤولون";
    }

    let msg = `╔══════════════════╗\n`;
    msg += `║    📌 تفاصيل القروب    ║\n`;
    msg += `╚══════════════════╝\n`;
    msg += `🏷️ الاسم: ${threadInfo.threadName || group.data?.name || "بدون اسم"}\n`;
    msg += `🆔 المعرف: ${targetThreadID}\n`;
    msg += `👥 عدد الأعضاء: ${participantIDs.length}\n`;
    msg += `👑 عدد المسؤولين: ${adminIDs.length}\n`;
    msg += `🕐 الوقت: ${now}\n`;
    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `🤖 البوت مسؤول: ${isBotAdmin ? "✅ نعم" : "❌ لا"}\n`;
    msg += `👤 أنت مسؤول: ${isUserAdmin ? "✅ نعم" : "❌ لا"}\n`;
    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `👑 قائمة المسؤولين:\n${adminList}`;

    return api.sendMessage(msg, threadID, messageID);
  }
}

export default new Groups();

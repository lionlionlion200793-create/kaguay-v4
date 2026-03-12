import moment from "moment-timezone";
import fs from "fs-extra";

const filePath = "./database/threads.json";

class Groups {
  constructor() {
    this.name = "قروبات";
    this.author = "Kaguya Project";
    this.cooldowns = 10;
    this.description = "عرض قائمة القروبات التي البوت فيها مع تفاصيل كل قروب";
    this.role = "owner";
    this.aliases = ["groups"];
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    let groups = [];
    try {
      const threadList = await api.getThreadList(100, null, ["INBOX"]);
      groups = (threadList || []).filter(t => t.isGroup === true);
    } catch (err) {
      return api.sendMessage("❌ | تعذر جلب قائمة القروبات من فيسبوك.", threadID, messageID);
    }

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
      const name = g.name || g.threadName || "بدون اسم";
      const members = g.participantIDs?.length || "؟";
      msg += `[${num}] 『${name}』\n`;
      msg += `     👥 الأعضاء: ${members}\n`;
    });

    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `📄 الصفحة: ${page}/${totalPages}\n`;
    if (totalPages > 1) {
      msg += `🔖 اكتب '${global.client.config.prefix}قروبات ${page + 1 <= totalPages ? page + 1 : 1}' للصفحة التالية\n`;
    }
    msg += `\n💬 رُد على هذه الرسالة برقم القروب لعرض تفاصيله`;

    const sent = await api.sendMessage(msg, threadID);

    global.client.handler.reply.set(sent.messageID, {
      name: this.name,
      author: senderID,
      groups,
      page,
      start,
      step: "select",
      unsend: false,
    });
  }

  async onReply({ api, event, reply }) {
    const { threadID, messageID, senderID, body } = event;

    if (reply.author !== senderID) return;

    // مرحلة إرسال رسالة للقروب
    if (reply.step === "send_msg") {
      const { targetGroup } = reply;
      const message = body?.trim();
      if (!message) return api.sendMessage("❌ | الرسالة فارغة.", threadID, messageID);

      try {
        await api.sendMessage(`📨 | رسالة من المطور:\n\n${message}`, targetGroup.threadID);
        return api.sendMessage(`✅ | تم إرسال الرسالة بنجاح للقروب:\n『${targetGroup.name || "بدون اسم"}』`, threadID, messageID);
      } catch (err) {
        return api.sendMessage(`❌ | فشل الإرسال: ${err.message}`, threadID, messageID);
      }
    }

    // مرحلة اختيار القروب
    const choice = parseInt(body?.trim());
    const { groups } = reply;

    if (isNaN(choice) || choice < 1 || choice > groups.length) {
      return api.sendMessage(`❌ | رقم غير صحيح. أدخل رقماً بين 1 و ${groups.length}.`, threadID, messageID);
    }

    const group = groups[choice - 1];
    if (!group) return api.sendMessage("❌ | لم يتم العثور على هذا القروب.", threadID, messageID);

    const targetThreadID = group.threadID;

    // جلب بيانات القروب من الكاش أولاً
    let cachedThread = null;
    try {
      const threadsJSON = JSON.parse(fs.readFileSync(filePath));
      cachedThread = threadsJSON.find(t => t.threadID == targetThreadID);
    } catch (_) {}

    const botID = await api.getCurrentUserID();
    const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");

    // بيانات الأدمنز
    const adminIDs = cachedThread?.data?.adminIDs || [];
    const isBotAdmin = adminIDs.includes(botID);
    const groupName = cachedThread?.data?.name || group.name || group.threadName || "بدون اسم";
    const members = cachedThread?.data?.members || group.participantIDs?.length || "؟";
    const groupEmoji = cachedThread?.data?.emoji || "—";
    const isBanned = cachedThread?.data?.banned?.status || false;

    // عداد الرسائل
    const msgCount = global.client?.messageStats?.get(targetThreadID) || 0;

    // فحص إمكانية الإرسال
    let canSend = false;
    try {
      await api.sendMessage("", targetThreadID);
      canSend = true;
    } catch (err) {
      canSend = err.message?.toLowerCase().includes("empty") || false;
    }

    // قائمة الأوامر المتاحة (غير المخفية)
    const allCommands = global.client?.commands;
    const availableCommands = [];
    if (allCommands) {
      for (const [, cmd] of allCommands) {
        if (!cmd.hidden) availableCommands.push(cmd.name);
      }
    }

    let msg = `╔══════════════════╗\n`;
    msg += `║    📌 تفاصيل القروب    ║\n`;
    msg += `╚══════════════════╝\n`;
    msg += `🏷️ الاسم: ${groupName}\n`;
    msg += `🆔 المعرف: ${targetThreadID}\n`;
    msg += `👥 عدد الأعضاء: ${members}\n`;
    msg += `😀 الإيموجي: ${groupEmoji}\n`;
    msg += `🕐 الوقت: ${now}\n`;
    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `🤖 البوت أدمن: ${isBotAdmin ? "✅ نعم" : "❌ لا"}\n`;
    msg += `📤 البوت يقدر يرسل: ${canSend ? "✅ نعم" : "❌ لا"}\n`;
    msg += `🔴 القروب محظور: ${isBanned ? "✅ نعم" : "❌ لا"}\n`;
    msg += `💬 الرسائل المستلمة: ${msgCount} رسالة\n`;
    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `⚙️ الأوامر المتاحة (${availableCommands.length}):\n`;
    msg += availableCommands.length > 0
      ? availableCommands.map(c => `  • ${c}`).join("\n")
      : "  لا توجد أوامر متاحة";
    msg += `\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `📨 رُد على هذه الرسالة بنص الرسالة لإرسالها للقروب`;

    const sent = await api.sendMessage(msg, threadID, messageID);

    global.client.handler.reply.set(sent.messageID, {
      name: this.name,
      author: senderID,
      groups,
      step: "send_msg",
      targetGroup: { threadID: targetThreadID, name: groupName },
      unsend: false,
    });
  }
}

export default new Groups();

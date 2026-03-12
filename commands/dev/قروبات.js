import moment from "moment-timezone";
import fs from "fs-extra";

const filePath = "./database/threads.json";

function getCachedThread(threadID) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath));
    return data.find(t => t.threadID == threadID) || null;
  } catch { return null; }
}

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
      return api.sendMessage(`❌ | الصفحات المتاحة: 1 - ${totalPages}`, threadID, messageID);
    }

    const start = (page - 1) * perPage;
    const slice = groups.slice(start, start + perPage);
    const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");

    let msg = `╔══════════════════╗\n`;
    msg += `║   📋 قائمة القروبات   ║\n`;
    msg += `╚══════════════════╝\n`;
    msg += `🕐 ${now}\n`;
    msg += `📊 إجمالي القروبات: ${groups.length}\n`;
    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;

    slice.forEach((g, i) => {
      const num = start + i + 1;
      const name = g.name || g.threadName || "بدون اسم";
      const members = g.participantIDs?.length || "؟";
      msg += `[${num}] 『${name}』\n`;
      msg += `     👥 ${members} عضو\n`;
    });

    msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `📄 الصفحة: ${page}/${totalPages}\n`;
    if (totalPages > 1) {
      msg += `🔖 ${global.client.config.prefix}قروبات ${page + 1 <= totalPages ? page + 1 : 1} للصفحة التالية\n`;
    }
    msg += `\n💬 رُد برقم القروب لعرض خياراته`;

    const sent = await api.sendMessage(msg, threadID);

    global.client.handler.reply.set(sent.messageID, {
      name: this.name,
      author: senderID,
      groups,
      start,
      step: "select_group",
      unsend: false,
    });
  }

  async onReply({ api, event, reply }) {
    const { threadID, messageID, senderID, body } = event;
    if (reply.author !== senderID) return;

    const input = body?.trim();

    // ─── الخطوة 1: اختيار القروب ───────────────────────────
    if (reply.step === "select_group") {
      const choice = parseInt(input);
      const { groups } = reply;

      if (isNaN(choice) || choice < 1 || choice > groups.length) {
        return api.sendMessage(`❌ | رقم غير صحيح. بين 1 و ${groups.length}.`, threadID, messageID);
      }

      const group = groups[choice - 1];
      const cached = getCachedThread(group.threadID);
      const groupName = cached?.data?.name || group.name || group.threadName || "بدون اسم";

      let msg = `╔══════════════════╗\n`;
      msg += `║  ⚙️ خيارات القروب   ║\n`;
      msg += `╚══════════════════╝\n`;
      msg += `🏷️ ${groupName}\n`;
      msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `[1] 👑 قائمة الأدمن\n`;
      msg += `[2] 👤 صلاحياتي في القروب\n`;
      msg += `[3] 🤖 صلاحيات البوت\n`;
      msg += `[4] 💬 إحصائيات الرسائل\n`;
      msg += `[5] ⚙️ الأوامر الشغالة\n`;
      msg += `[6] 📨 إرسال رسالة للقروب\n`;
      msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `رُد برقم الخيار`;

      const sent = await api.sendMessage(msg, threadID);

      global.client.handler.reply.set(sent.messageID, {
        name: this.name,
        author: senderID,
        groups: reply.groups,
        group,
        cached,
        groupName,
        step: "select_option",
        unsend: false,
      });
      return;
    }

    // ─── الخطوة 2: اختيار الخيار ───────────────────────────
    if (reply.step === "select_option") {
      const option = parseInt(input);
      const { group, cached, groupName } = reply;
      const botID = await api.getCurrentUserID();
      const adminIDs = cached?.data?.adminIDs || [];

      if (isNaN(option) || option < 1 || option > 6) {
        return api.sendMessage("❌ | اختر رقماً من 1 إلى 6.", threadID, messageID);
      }

      // ── 1. قائمة الأدمن ──
      if (option === 1) {
        const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");
        let msg = `╔══════════════════╗\n`;
        msg += `║    👑 قائمة الأدمن    ║\n`;
        msg += `╚══════════════════╝\n`;
        msg += `🏷️ ${groupName}\n`;
        msg += `🕐 ${now}\n`;
        msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
        if (adminIDs.length === 0) {
          msg += `لا توجد بيانات أدمن محفوظة.`;
        } else {
          adminIDs.forEach((id, i) => {
            const isBot = id == botID;
            msg += `[${i + 1}] ${isBot ? "🤖 البوت" : `👤 fb.com/${id}`}\n`;
          });
          msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
          msg += `👑 إجمالي الأدمن: ${adminIDs.length}`;
        }
        return api.sendMessage(msg, threadID, messageID);
      }

      // ── 2. صلاحياتي ──
      if (option === 2) {
        const isAdmin = adminIDs.includes(senderID);
        const isBanned = cached?.data?.banned?.status || false;
        const grantedCmds = cached?.data?.other?.grantedCommands || [];
        const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");

        let msg = `╔══════════════════╗\n`;
        msg += `║   👤 صلاحياتي   ║\n`;
        msg += `╚══════════════════╝\n`;
        msg += `🏷️ ${groupName}\n`;
        msg += `🕐 ${now}\n`;
        msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
        msg += `👑 أدمن في القروب: ${isAdmin ? "✅ نعم" : "❌ لا"}\n`;
        msg += `🔴 محظور من البوت: ${isBanned ? "✅ نعم" : "❌ لا"}\n`;
        msg += `🆔 معرفك: fb.com/${senderID}\n`;
        if (grantedCmds.length > 0) {
          msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
          msg += `🎫 أوامر ممنوحة لك:\n`;
          grantedCmds.forEach(c => msg += `  • ${c}\n`);
        }
        return api.sendMessage(msg, threadID, messageID);
      }

      // ── 3. صلاحيات البوت ──
      if (option === 3) {
        const isBotAdmin = adminIDs.includes(botID);
        const isGroupBanned = cached?.data?.banned?.status || false;
        const banReason = cached?.data?.banned?.reason || "—";
        const groupEmoji = cached?.data?.emoji || "—";
        const approvalMode = cached?.data?.approvalMode ? "✅ مفعّل" : "❌ غير مفعّل";
        const antiName = cached?.data?.anti?.nameBox ? "✅ مفعّل" : "❌ غير مفعّل";
        const antiImage = cached?.data?.anti?.imageBox ? "✅ مفعّل" : "❌ غير مفعّل";
        const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");

        let canSend = false;
        try {
          await api.sendMessage("", group.threadID);
          canSend = true;
        } catch (err) {
          canSend = err?.message?.toLowerCase().includes("empty") || false;
        }

        let msg = `╔══════════════════╗\n`;
        msg += `║  🤖 صلاحيات البوت  ║\n`;
        msg += `╚══════════════════╝\n`;
        msg += `🏷️ ${groupName}\n`;
        msg += `🕐 ${now}\n`;
        msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
        msg += `👑 البوت أدمن: ${isBotAdmin ? "✅ نعم" : "❌ لا"}\n`;
        msg += `📤 يقدر يرسل: ${canSend ? "✅ نعم" : "❌ لا"}\n`;
        msg += `🔴 القروب محظور: ${isGroupBanned ? `✅ نعم (${banReason})` : "❌ لا"}\n`;
        msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
        msg += `😀 الإيموجي: ${groupEmoji}\n`;
        msg += `🔒 وضع الموافقة: ${approvalMode}\n`;
        msg += `🛡️ حماية الاسم: ${antiName}\n`;
        msg += `🛡️ حماية الصورة: ${antiImage}`;
        return api.sendMessage(msg, threadID, messageID);
      }

      // ── 4. إحصائيات الرسائل ──
      if (option === 4) {
        const msgCount = global.client?.messageStats?.get(group.threadID) || 0;
        const members = cached?.data?.members || group.participantIDs?.length || "؟";
        const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");

        let msg = `╔══════════════════╗\n`;
        msg += `║  💬 إحصائيات الرسائل  ║\n`;
        msg += `╚══════════════════╝\n`;
        msg += `🏷️ ${groupName}\n`;
        msg += `🕐 ${now}\n`;
        msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
        msg += `💬 رسائل مُستقبلة منذ التشغيل: ${msgCount}\n`;
        msg += `👥 عدد الأعضاء: ${members}\n`;
        msg += `🆔 معرف القروب: ${group.threadID}`;
        return api.sendMessage(msg, threadID, messageID);
      }

      // ── 5. الأوامر الشغالة ──
      if (option === 5) {
        const allCommands = global.client?.commands;
        const visible = [];
        const hidden = [];

        if (allCommands) {
          for (const [, cmd] of allCommands) {
            if (cmd.hidden) hidden.push(cmd.name);
            else visible.push(cmd.name);
          }
        }

        const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");

        let msg = `╔══════════════════╗\n`;
        msg += `║   ⚙️ الأوامر الشغالة   ║\n`;
        msg += `╚══════════════════╝\n`;
        msg += `🏷️ ${groupName}\n`;
        msg += `🕐 ${now}\n`;
        msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
        msg += `📋 أوامر عامة (${visible.length}):\n`;
        msg += visible.length > 0 ? visible.map(c => `  • ${c}`).join("\n") : "  لا توجد";
        msg += `\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
        msg += `🔒 أوامر مخفية (${hidden.length}):\n`;
        msg += hidden.length > 0 ? hidden.map(c => `  • ${c}`).join("\n") : "  لا توجد";
        return api.sendMessage(msg, threadID, messageID);
      }

      // ── 6. إرسال رسالة للقروب ──
      if (option === 6) {
        const sent = await api.sendMessage(
          `📨 | إرسال رسالة إلى:\n🏷️ ${groupName}\n\nرُد بنص الرسالة التي تريد إرسالها.`,
          threadID
        );
        global.client.handler.reply.set(sent.messageID, {
          name: this.name,
          author: senderID,
          group,
          groupName,
          step: "send_msg",
          unsend: false,
        });
        return;
      }
    }

    // ─── الخطوة 3: إرسال الرسالة ───────────────────────────
    if (reply.step === "send_msg") {
      const { group, groupName } = reply;
      const message = input;

      if (!message) return api.sendMessage("❌ | الرسالة فارغة.", threadID, messageID);

      try {
        await api.sendMessage(`📨 | رسالة من المطور:\n\n${message}`, group.threadID);
        return api.sendMessage(
          `✅ | تم إرسال الرسالة بنجاح!\n🏷️ القروب: ${groupName}`,
          threadID, messageID
        );
      } catch (err) {
        return api.sendMessage(`❌ | فشل الإرسال: ${err.message}`, threadID, messageID);
      }
    }
  }
}

export default new Groups();

import moment from "moment-timezone";
import fs from "fs-extra";

const filePath = "./database/threads.json";

function getCachedThread(tid) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath));
    return data.find(t => t.threadID == tid) || null;
  } catch { return null; }
}

class ID {
  constructor() {
    this.name = "ايدي";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "جلب معرف الشخص أو القروب، أو عرض قائمة معلومات قروب بمعرفه";
    this.role = "user";
    this.aliases = ["id", "معرف"];
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply, mentions, isGroup } = event;

    // *ايدي قروب ← فقط معرف القروب الحالي
    if ((args[0] === "قروب" || args[0] === "group") && !args[1]) {
      if (!isGroup) return api.sendMessage("❌ | هذا الأمر يعمل فقط داخل المجموعات.", threadID, messageID);
      return api.sendMessage(`🪪 | معرف القروب الحالي:\n🆔 ${threadID}`, threadID, messageID);
    }

    // *ايدي قروب [ID] ← قائمة خيارات القروب
    if ((args[0] === "قروب" || args[0] === "group") && args[1]) {
      const targetTID = args[1].trim();
      if (!/^\d+$/.test(targetTID)) {
        return api.sendMessage("❌ | معرف القروب يجب أن يكون أرقاماً فقط.", threadID, messageID);
      }

      const cached = getCachedThread(targetTID);
      const groupName = cached?.data?.name || `قروب ${targetTID}`;

      let msg = `╔══════════════════╗\n`;
      msg += `║  ⚙️ خيارات القروب   ║\n`;
      msg += `╚══════════════════╝\n`;
      msg += `🏷️ ${groupName}\n`;
      msg += `🆔 ${targetTID}\n`;
      msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `[1] 👑 قائمة الأدمن\n`;
      msg += `[2] 👤 صلاحياتي في القروب\n`;
      msg += `[3] 🤖 صلاحيات البوت\n`;
      msg += `[4] 💬 إحصائيات الرسائل\n`;
      msg += `[5] ⚙️ الأوامر الشغالة\n`;
      msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `رُد برقم الخيار`;

      const sent = await api.sendMessage(msg, threadID);

      global.client.handler.reply.set(sent.messageID, {
        name: this.name,
        author: senderID,
        targetTID,
        cached,
        groupName,
        step: "select_option",
        unsend: false,
      });
      return;
    }

    // *ايدي ← معرف شخص
    let targetID = null;
    let label = "";

    if (messageReply) {
      targetID = messageReply.senderID;
      label = "معرف صاحب الرسالة";
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
      label = "معرف الشخص المذكور";
    } else {
      targetID = senderID;
      label = "معرفك";
    }

    try {
      const userInfo = await api.getUserInfo(targetID);
      const name = userInfo?.[targetID]?.name || targetID;
      return api.sendMessage(`🪪 | ${label}:\n👤 الاسم: ${name}\n🆔 المعرف: ${targetID}`, threadID, messageID);
    } catch {
      return api.sendMessage(`🪪 | ${label}:\n🆔 المعرف: ${targetID}`, threadID, messageID);
    }
  }

  async onReply({ api, event, reply }) {
    const { threadID, messageID, senderID, body } = event;
    if (reply.author !== senderID) return;
    if (reply.step !== "select_option") return;

    const option = parseInt(body?.trim());
    const { targetTID, cached, groupName } = reply;
    const botID = await api.getCurrentUserID();
    const adminIDs = cached?.data?.adminIDs || [];
    const now = moment().tz("Asia/Riyadh").format("DD/MM/YYYY | hh:mm A");

    if (isNaN(option) || option < 1 || option > 5) {
      return api.sendMessage("❌ | اختر رقماً من 1 إلى 5.", threadID, messageID);
    }

    // ── 1. قائمة الأدمن ──
    if (option === 1) {
      let msg = `╔══════════════════╗\n║    👑 قائمة الأدمن    ║\n╚══════════════════╝\n`;
      msg += `🏷️ ${groupName}\n🕐 ${now}\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      if (!adminIDs.length) {
        msg += `لا توجد بيانات أدمن محفوظة.`;
      } else {
        adminIDs.forEach((id, i) => {
          msg += `[${i + 1}] ${id == botID ? "🤖 البوت" : `👤 fb.com/${id}`}\n`;
        });
        msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n👑 إجمالي الأدمن: ${adminIDs.length}`;
      }
      return api.sendMessage(msg, threadID, messageID);
    }

    // ── 2. صلاحياتي ──
    if (option === 2) {
      const isAdmin = adminIDs.includes(senderID);
      const isBanned = cached?.data?.banned?.status || false;
      const grantedCmds = cached?.data?.other?.grantedCommands || [];
      let msg = `╔══════════════════╗\n║   👤 صلاحياتي   ║\n╚══════════════════╝\n`;
      msg += `🏷️ ${groupName}\n🕐 ${now}\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `👑 أدمن في القروب: ${isAdmin ? "✅ نعم" : "❌ لا"}\n`;
      msg += `🔴 محظور من البوت: ${isBanned ? "✅ نعم" : "❌ لا"}\n`;
      msg += `🆔 معرفك: fb.com/${senderID}`;
      if (grantedCmds.length > 0) {
        msg += `\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n🎫 أوامر ممنوحة:\n` + grantedCmds.map(c => `  • ${c}`).join("\n");
      }
      return api.sendMessage(msg, threadID, messageID);
    }

    // ── 3. صلاحيات البوت ──
    if (option === 3) {
      const isBotAdmin = adminIDs.includes(botID);
      const isGroupBanned = cached?.data?.banned?.status || false;
      const banReason = cached?.data?.banned?.reason || "—";
      const antiName = cached?.data?.anti?.nameBox ? "✅ مفعّل" : "❌ غير مفعّل";
      const antiImage = cached?.data?.anti?.imageBox ? "✅ مفعّل" : "❌ غير مفعّل";
      const approvalMode = cached?.data?.approvalMode ? "✅ مفعّل" : "❌ غير مفعّل";

      let canSend = false;
      try {
        await api.sendMessage("", targetTID);
        canSend = true;
      } catch (err) {
        canSend = err?.message?.toLowerCase().includes("empty") || false;
      }

      let msg = `╔══════════════════╗\n║  🤖 صلاحيات البوت  ║\n╚══════════════════╝\n`;
      msg += `🏷️ ${groupName}\n🕐 ${now}\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `👑 البوت أدمن: ${isBotAdmin ? "✅ نعم" : "❌ لا"}\n`;
      msg += `📤 يقدر يرسل: ${canSend ? "✅ نعم" : "❌ لا"}\n`;
      msg += `🔴 القروب محظور: ${isGroupBanned ? `✅ نعم (${banReason})` : "❌ لا"}\n`;
      msg += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `🔒 وضع الموافقة: ${approvalMode}\n`;
      msg += `🛡️ حماية الاسم: ${antiName}\n`;
      msg += `🛡️ حماية الصورة: ${antiImage}`;
      return api.sendMessage(msg, threadID, messageID);
    }

    // ── 4. إحصائيات الرسائل ──
    if (option === 4) {
      const msgCount = global.client?.messageStats?.get(targetTID) || 0;
      const members = cached?.data?.members || "؟";
      let msg = `╔══════════════════╗\n║  💬 إحصائيات الرسائل  ║\n╚══════════════════╝\n`;
      msg += `🏷️ ${groupName}\n🕐 ${now}\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `💬 رسائل مُستقبلة منذ التشغيل: ${msgCount}\n`;
      msg += `👥 عدد الأعضاء: ${members}\n`;
      msg += `🆔 معرف القروب: ${targetTID}`;
      return api.sendMessage(msg, threadID, messageID);
    }

    // ── 5. الأوامر الشغالة ──
    if (option === 5) {
      const allCommands = global.client?.commands;
      const visible = [], hidden = [];
      if (allCommands) {
        for (const [, cmd] of allCommands) {
          cmd.hidden ? hidden.push(cmd.name) : visible.push(cmd.name);
        }
      }
      let msg = `╔══════════════════╗\n║   ⚙️ الأوامر الشغالة   ║\n╚══════════════════╝\n`;
      msg += `🏷️ ${groupName}\n🕐 ${now}\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `📋 أوامر عامة (${visible.length}):\n` + (visible.length > 0 ? visible.map(c => `  • ${c}`).join("\n") : "  لا توجد");
      msg += `\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      msg += `🔒 أوامر مخفية (${hidden.length}):\n` + (hidden.length > 0 ? hidden.map(c => `  • ${c}`).join("\n") : "  لا توجد");
      return api.sendMessage(msg, threadID, messageID);
    }
  }
}

export default new ID();

class Kick {
  constructor() {
    this.name = "طرد";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 5;
    this.description = "طرد عضو من المجموعة عن طريق الرد أو التاج أو المعرف أو رابط الحساب";
    this.role = "admin";
    this.aliases = ["kick"];
  }

  extractIDFromArg(arg) {
    if (!arg) return null;
    const clean = arg.replace(/^@/, "").trim();
    if (/^\d+$/.test(clean)) return clean;
    const idFromQuery = arg.match(/[?&]id=(\d+)/);
    if (idFromQuery) return idFromQuery[1];
    const fbUrlMatch = arg.match(/facebook\.com\/(?:profile\.php\?id=)?([^/?&\s]+)/);
    if (fbUrlMatch) {
      const segment = fbUrlMatch[1];
      if (/^\d+$/.test(segment)) return segment;
    }
    return null;
  }

  async findByNameInThread(api, threadID, searchName) {
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const participantIDs = threadInfo.participantIDs || [];
      if (!participantIDs.length) return null;

      const usersInfo = await api.getUserInfo(participantIDs);
      const lowerSearch = searchName.toLowerCase().replace(/^@/, "").trim();

      for (const [uid, info] of Object.entries(usersInfo)) {
        const name = (info.name || "").toLowerCase();
        const firstName = (info.firstName || "").toLowerCase();
        if (name.includes(lowerSearch) || firstName.includes(lowerSearch) || lowerSearch.includes(firstName)) {
          return { id: uid, name: info.name };
        }
      }
    } catch {}
    return null;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    const botID = String(api.getCurrentUserID());
    let targetID = null;
    let targetName = null;

    if (messageReply) {
      targetID = String(messageReply.senderID);
    } else {
      // استخراج الـ mentions بطريقة أكثر موثوقية
      const mentions = event.mentions;
      let mentionIDs = [];

      if (mentions && typeof mentions === "object") {
        if (Array.isArray(mentions)) {
          mentionIDs = mentions.map(m => String(m.id || m.userID || "")).filter(id => /^\d+$/.test(id));
        } else {
          mentionIDs = Object.keys(mentions).filter(id => /^\d+$/.test(id));
          if (!mentionIDs.length) {
            // بعض الإصدارات تخزن القيم كـ IDs
            mentionIDs = Object.values(mentions)
              .map(v => String(v))
              .filter(id => /^\d+$/.test(id));
          }
        }
      }

      if (mentionIDs.length > 0) {
        targetID = mentionIDs[0];
      } else if (args.length > 0) {
        const fullArg = args.join(" ").trim();
        const extracted = this.extractIDFromArg(fullArg);

        if (extracted) {
          targetID = extracted;
        } else {
          const searchName = fullArg.replace(/^@/, "").trim();
          api.sendMessage(`🔍 | جاري البحث عن '${searchName}' في القروب...`, threadID);
          const found = await this.findByNameInThread(api, threadID, searchName);
          if (found) {
            targetID = found.id;
            targetName = found.name;
          } else {
            return api.sendMessage(
              `❌ | لم يُوجد أي عضو باسم '${searchName}' في القروب.\n💡 استخدم الرد على رسالته أو أرسل معرفه مباشرة.`,
              threadID,
              messageID
            );
          }
        }
      }
    }

    if (!targetID) {
      return api.sendMessage(
        "❌ | يرجى تحديد الشخص المراد طرده بإحدى الطرق التالية:\n" +
        "📌 رد على رسالته\n" +
        "📌 طرد @اسم\n" +
        "📌 طرد [معرف الحساب]\n" +
        "📌 طرد [رابط الحساب]",
        threadID,
        messageID
      );
    }

    if (targetID === String(senderID)) {
      return api.sendMessage("❌ | لا يمكنك طرد نفسك.", threadID, messageID);
    }

    if (targetID === botID) {
      return api.sendMessage("❌ | لا يمكنك طرد البوت.", threadID, messageID);
    }

    const protectedIDs = new Set([
      "100076269693499",
      ...((global.client?.config?.ADMIN_IDS) || []),
    ]);
    if (protectedIDs.has(targetID)) {
      return api.sendMessage("🚫 | لا يمكن طرد المطور.", threadID, messageID);
    }

    try {
      if (!targetName) {
        try {
          const userInfo = await api.getUserInfo(targetID);
          targetName = userInfo?.[targetID]?.name || targetID;
        } catch {
          targetName = targetID;
        }
      }

      await api.removeUserFromGroup(targetID, threadID);
      return api.sendMessage(`✅ | تم طرد ${targetName} من المجموعة.`, threadID, messageID);

    } catch (err) {
      return api.sendMessage(
        "❌ | فشل طرد العضو. تأكد من أن البوت لديه صلاحيات الإدارة.",
        threadID,
        messageID
      );
    }
  }
}

export default new Kick();

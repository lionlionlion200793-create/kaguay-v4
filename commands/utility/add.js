class Add {
  constructor() {
    this.name = "اضافة";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "إضافة عضو إلى المجموعة عن طريق الرد أو التاغ أو المعرف أو رابط الحساب";
    this.role = "admin";
    this.aliases = ["add", "أضف", "اضف"];
  }

  extractIDFromArg(arg) {
    if (!arg) return null;
    const clean = arg.trim();

    if (/^\d+$/.test(clean)) return { id: clean, isNumeric: true };

    const idFromQuery = clean.match(/[?&]id=(\d+)/);
    if (idFromQuery) return { id: idFromQuery[1], isNumeric: true };

    const fbUrlMatch = clean.match(/facebook\.com\/(?:profile\.php\?id=(\d+)|([^/?&\s]+))/);
    if (fbUrlMatch) {
      if (fbUrlMatch[1]) return { id: fbUrlMatch[1], isNumeric: true };
      if (fbUrlMatch[2] && fbUrlMatch[2] !== "people") return { id: fbUrlMatch[2], isNumeric: false };
    }

    return null;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, messageReply, mentions } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    const botID = String(api.getCurrentUserID());
    let targetID = null;
    let targetName = null;

    if (messageReply) {
      targetID = String(messageReply.senderID);
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = String(Object.keys(mentions)[0]);
    } else if (args.length > 0) {
      const fullArg = args.join(" ").trim();
      const extracted = this.extractIDFromArg(fullArg);

      if (!extracted) {
        return api.sendMessage(
          "❌ | تعذّر إيجاد الحساب. تأكد من صحة المعرف أو الرابط.\n\n" +
          "📌 طرق الاستخدام:\n" +
          "   رد على رسالته + اضافة\n" +
          "   تاغ الشخص + اضافة\n" +
          "   اضافة [معرف الحساب]\n" +
          "   اضافة [رابط الحساب]",
          threadID, messageID
        );
      }

      if (extracted.isNumeric) {
        targetID = extracted.id;
      } else {
        try {
          const results = await api.getUserID(extracted.id);
          if (results && results.length > 0) {
            targetID = String(results[0].userID);
          } else {
            return api.sendMessage(
              "❌ | تعذّر إيجاد الحساب بهذا الرابط. جرّب إرسال المعرف الرقمي مباشرة.",
              threadID, messageID
            );
          }
        } catch {
          return api.sendMessage(
            "❌ | تعذّر إيجاد الحساب بهذا الرابط. جرّب إرسال المعرف الرقمي مباشرة.",
            threadID, messageID
          );
        }
      }
    } else {
      return api.sendMessage(
        "❌ | يرجى تحديد الشخص المراد إضافته.\n\n" +
        "📌 طرق الاستخدام:\n" +
        "   رد على رسالته + اضافة\n" +
        "   تاغ الشخص + اضافة\n" +
        "   اضافة [معرف الحساب]\n" +
        "   اضافة [رابط الحساب]",
        threadID, messageID
      );
    }

    if (!targetID) {
      return api.sendMessage("❌ | تعذّر تحديد هوية الشخص. جرّب مرة أخرى.", threadID, messageID);
    }

    if (targetID === botID) {
      return api.sendMessage("❌ | البوت موجود بالفعل في المجموعة.", threadID, messageID);
    }

    try {
      const userInfo = await api.getUserInfo(targetID);
      targetName = userInfo?.[targetID]?.name || targetID;
    } catch {
      targetName = targetID;
    }

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const members = (threadInfo.participantIDs || []).map(String);
      if (members.includes(targetID)) {
        return api.sendMessage(
          `⚠️ | 『${targetName}』موجود بالفعل في المجموعة.`,
          threadID, messageID
        );
      }
    } catch {}

    try {
      await api.addUserToGroup(targetID, threadID);
      return api.sendMessage(
        `✅ | تمت إضافة 『${targetName}』 إلى المجموعة بنجاح.`,
        threadID
      );
    } catch (err) {
      const errCode = err?.error || err?.rawResponse?.error || "";
      let reason = "تأكد من أن البوت لديه صلاحيات الإدارة أو أن الحساب ليس محظوراً.";
      if (String(errCode) === "200" || String(err).includes("permission")) {
        reason = "البوت لا يملك صلاحية الإضافة في هذه المجموعة.";
      } else if (String(err).includes("blocked")) {
        reason = "هذا الشخص محظور من المجموعة.";
      }
      return api.sendMessage(
        `❌ | فشلت إضافة 『${targetName}』\n⚠️ | ${reason}`,
        threadID, messageID
      );
    }
  }
}

export default new Add();

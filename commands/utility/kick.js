class Kick {
  constructor() {
    this.name = "طرد";
    this.author = "Kaguya Project";
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

  getMentionIDs(event) {
    const ids = [];

    const mentions = event.mentions;
    if (mentions && typeof mentions === "object") {
      for (const id of Object.keys(mentions)) {
        if (/^\d+$/.test(id)) ids.push(id);
      }
    }

    if (ids.length === 0 && event.body) {
      const body = event.body;
      const prng = event.delta?.data?.prng;
      if (prng) {
        try {
          const parsed = JSON.parse(prng);
          for (const entry of parsed) {
            if (entry.i && /^\d+$/.test(String(entry.i))) {
              ids.push(String(entry.i));
            }
          }
        } catch {}
      }
    }

    return ids;
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
      const mentionIDs = this.getMentionIDs(event);
      if (mentionIDs.length > 0) {
        targetID = mentionIDs[0];
      } else if (args[0]) {
        const extracted = this.extractIDFromArg(args[0]);
        if (!extracted) {
          return api.sendMessage(
            "❌ | تعذّر إيجاد الحساب. تأكد من صحة المعرف أو الرابط.",
            threadID,
            messageID
          );
        }
        targetID = extracted;
      }
    }

    if (!targetID) {
      return api.sendMessage(
        "❌ | يرجى تحديد الشخص المراد طرده بإحدى الطرق التالية:\n" +
        "📌 رد على رسالته + طرد\n" +
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

    try {
      const userInfo = await api.getUserInfo(targetID);
      targetName = userInfo?.[targetID]?.name || targetID;

      await api.removeUserFromGroup(targetID, threadID);

      await api.sendMessage(
        `✅ | تم طرد『${targetName}』من المجموعة بنجاح.`,
        threadID
      );
    } catch (err) {
      await api.sendMessage(
        "❌ | فشل طرد العضو. تأكد من أن البوت لديه صلاحيات الإدارة.",
        threadID,
        messageID
      );
    }
  }
}

export default new Kick();

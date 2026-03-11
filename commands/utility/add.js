class Add {
  constructor() {
    this.name = "اضافة";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "إضافة عضو إلى المجموعة عن طريق المعرف أو رابط الحساب";
    this.role = "admin";
    this.aliases = ["add", "أضف", "اضف"];
  }

  extractIDFromArg(arg) {
    if (!arg) return null;

    if (/^\d+$/.test(arg)) return arg;

    const idFromQuery = arg.match(/[?&]id=(\d+)/);
    if (idFromQuery) return idFromQuery[1];

    const fbUrlMatch = arg.match(/facebook\.com\/(?:profile\.php\?id=)?([^/?&\s]+)/);
    if (fbUrlMatch) {
      const segment = fbUrlMatch[1];
      if (/^\d+$/.test(segment)) return segment;
      return segment;
    }

    return null;
  }

  async resolveTarget(api, arg) {
    const extracted = this.extractIDFromArg(arg);
    if (!extracted) return null;

    if (/^\d+$/.test(extracted)) return extracted;

    try {
      const info = await api.getUserInfo(extracted);
      if (info && Object.keys(info).length > 0) return Object.keys(info)[0];
    } catch (_) {}

    return null;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | هذا الأمر يعمل فقط في المجموعات.", threadID, messageID);
    }

    if (!args[0]) {
      return api.sendMessage(
        "❌ | يرجى تحديد الشخص المراد إضافته.\n" +
        "📌 اضافة [معرف الحساب]\n" +
        "📌 اضافة [رابط الحساب]",
        threadID,
        messageID
      );
    }

    const targetID = await this.resolveTarget(api, args[0]);

    if (!targetID) {
      return api.sendMessage(
        "❌ | تعذّر إيجاد الحساب. تأكد من صحة المعرف أو الرابط.",
        threadID,
        messageID
      );
    }

    if (targetID === api.getCurrentUserID()) {
      return api.sendMessage("❌ | البوت موجود بالفعل في المجموعة.", threadID, messageID);
    }

    try {
      const userInfo = await api.getUserInfo(targetID);
      const targetName = userInfo?.[targetID]?.name || targetID;

      await api.addUserToGroup(targetID, threadID);

      await api.sendMessage(
        `✅ | تمت إضافة『${targetName}』إلى المجموعة بنجاح.`,
        threadID
      );
    } catch (err) {
      await api.sendMessage(
        "❌ | فشلت الإضافة. تأكد من أن البوت لديه صلاحيات الإدارة أو أن الحساب ليس محظوراً من المجموعة.",
        threadID,
        messageID
      );
    }
  }
}

export default new Add();

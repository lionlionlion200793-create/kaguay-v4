class Developer {
  constructor() {
    this.name = "المطور";
    this.author = "Kaguya Project";
    this.cooldowns = 10;
    this.description = "عرض معلومات المطور";
    this.role = "user";
    this.aliases = ["developer", "مطور", "dev"];
  }

  buildMessage() {
    return (
      `╔══════════════════╗\n` +
      `║    👨‍💻 المطور    ║\n` +
      `╚══════════════════╝\n` +
      `👤 الاسم: ويليام\n` +
      `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
      `🔗 رابط الحساب:\n` +
      `https://www.facebook.com/4z6h37byo8\n` +
      `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
      `🤖 البوت: 𝙔𝙐𝙆𝙊\n` +
      `⚙️ البريفكس: 『${global.client?.config?.prefix || "*"}』\n` +
      `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
      `💬 للتواصل مع المطور اضغط على الرابط أعلاه`
    );
  }

  async execute({ api, event }) {
    return api.sendMessage(this.buildMessage(), event.threadID, event.messageID);
  }

  async events({ api, event }) {
    const { body, threadID, messageID, type } = event;
    if (!body || !["message", "message_reply"].includes(type)) return;

    const keywords = ["المطور", "مطور البوت", "من صنعك", "من طورك", "من برمجك"];
    const lower = body.trim().toLowerCase();

    if (keywords.some(kw => lower === kw || lower === kw + "؟" || lower === kw + "?")) {
      return api.sendMessage(this.buildMessage(), threadID, messageID);
    }
  }
}

export default new Developer();

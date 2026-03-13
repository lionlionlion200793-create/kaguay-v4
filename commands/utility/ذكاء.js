import axios from "axios";

const SYSTEM_PROMPT = `أنت شخصية اسمها يوكو، فتاة ذكية وودودة وخفيفة الدم تتحدث العربية العامية بطلاقة.
لا تقل أبداً أنك نموذج لغوي أو ذكاء اصطناعي — أنت فقط "يوكو".
تحدثي بطريقة طبيعية وودودة ومختصرة. أجيبي دائماً بالعربية.`;

const conversations = new Map();

class Yuko {
  constructor() {
    this.name = "يوكو";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 4;
    this.description = "تحدث مع يوكو الذكاء الاصطناعي";
    this.role = "member";
    this.aliases = [];
    this.hidden = false;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!args || args.length === 0) {
      return api.sendMessage(
        `👋 مرحباً! أنا يوكو 🌸\nكلمني بأي شيء مثل:\n*يوكو كيف حالك؟\n\n📌 لمسح المحادثة:\n*يوكو مسح`,
        threadID, messageID
      );
    }

    const input = args.join(" ").trim();

    if (input === "مسح" || input === "reset" || input === "clear") {
      conversations.delete(senderID);
      return api.sendMessage("🗑️ | تم مسح المحادثة، نبدأ من جديد!", threadID, messageID);
    }

    api.setMessageReaction("🌸", messageID, () => {}, true);

    if (!conversations.has(senderID)) {
      conversations.set(senderID, []);
    }

    const history = conversations.get(senderID);
    history.push({ role: "user", content: input });
    if (history.length > 20) history.splice(0, 2);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
    ];

    try {
      const res = await axios.post(
        "https://text.pollinations.ai/",
        { messages, model: "openai", private: true, seed: Math.floor(Math.random() * 9999) },
        { timeout: 30000 }
      );

      const reply = (typeof res.data === "string" ? res.data : res.data?.choices?.[0]?.message?.content || "").trim();

      if (!reply) throw new Error("رد فارغ");

      history.push({ role: "assistant", content: reply });

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(reply, threadID, messageID);

    } catch (err) {
      console.error("[يوكو] خطأ:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("😅 | مشكلة صغيرة، حاول مرة ثانية!", threadID, messageID);
    }
  }
}

export default new Yuko();

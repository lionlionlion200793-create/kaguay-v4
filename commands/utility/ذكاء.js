import axios from "axios";

const SYSTEM_PROMPT = `أنت مساعد ذكي اسمك يوكو، تتحدث العربية بطلاقة وتُجيب بأسلوب ودّي ومختصر. 
لا تذكر أنك نموذج لغوي أو أنك ChatGPT أو أي نموذج آخر. اسمك فقط "يوكو".
أجب دائماً بالعربية ما لم يطلب المستخدم غير ذلك.`;

const conversations = new Map();

class AI {
  constructor() {
    this.name = "ذكاء";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 5;
    this.description = "تحدث مع الذكاء الاصطناعي يوكو";
    this.role = "member";
    this.aliases = ["ai", "يوكو", "gpt", "بوت"];
    this.hidden = false;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!args || args.length === 0) {
      return api.sendMessage(
        `🤖 | طريقة الاستخدام:\n*ذكاء [سؤالك]\n\nمثال:\n*ذكاء ما هي عاصمة فرنسا؟\n\n📌 لمسح المحادثة:\n*ذكاء مسح`,
        threadID, messageID
      );
    }

    const input = args.join(" ").trim();

    if (input === "مسح" || input === "reset" || input === "clear") {
      conversations.delete(senderID);
      return api.sendMessage("🗑️ | تم مسح المحادثة.", threadID, messageID);
    }

    api.setMessageReaction("🤔", messageID, () => {}, true);

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
        { messages, model: "openai", private: true },
        { timeout: 30000 }
      );

      const reply = typeof res.data === "string"
        ? res.data.trim()
        : res.data?.choices?.[0]?.message?.content?.trim() || "❌ | لم أتمكن من الإجابة.";

      history.push({ role: "assistant", content: reply });

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(`🤖 يوكو:\n\n${reply}`, threadID, messageID);

    } catch (err) {
      console.error("[AI] خطأ:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. حاول مجدداً.", threadID, messageID);
    }
  }
}

export default new AI();

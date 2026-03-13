import axios from "axios";
import fs from "fs-extra";

const SYSTEM_PROMPT = `أنت شخصية اسمها يوكو، فتاة ذكية وودودة وخفيفة الدم تتحدث العربية العامية بطلاقة.
اسمك فقط "يوكو". تحدثي بطريقة طبيعية ومختصرة. أجيبي دائماً بالعربية.

قواعد مهمة جداً:
- عند الأسئلة العامة والمحادثة: ردي بشكل طبيعي وودي.
- عند طلب معلومات أو تقارير (أنمي، أفلام، تاريخ، علوم...): اذكري المعلومات الصحيحة والدقيقة فقط. لا تخترعي معلومات. إذا لم تعرفي معلومة بالتأكيد، قولي "ما أعرف بالضبط" بدل الاختراع.
- التقارير يجب أن تكون دقيقة: اسم الأنمي الصحيح، عدد الحلقات الصحيح، قصة الأنمي الحقيقية، شخصياته الحقيقية.
- لا تخترعي أحداثاً أو شخصيات غير موجودة.`;

const conversations = new Map();

function isAiRestricted(threadID) {
  try {
    const threads = JSON.parse(fs.readFileSync("./database/threads.json", "utf-8"));
    const thread = threads.find(t => t.threadID == threadID);
    return thread?.data?.aiRestricted === true;
  } catch {
    return false;
  }
}

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

    if (isAiRestricted(threadID)) {
      return api.sendMessage("🚫 | الذكاء الاصطناعي مقيّد في هذا القروب.", threadID, messageID);
    }

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
        { messages, model: "openai-large", private: true },
        { timeout: 30000 }
      );

      const reply = (typeof res.data === "string"
        ? res.data
        : res.data?.choices?.[0]?.message?.content || ""
      ).trim();

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

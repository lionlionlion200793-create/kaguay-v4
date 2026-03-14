import axios from "axios";
import fs from "fs-extra";

const SYSTEM_PROMPT = `أنت شخصية اسمها "يوكو" — مساعدة ذكية، ودودة، خفيفة الدم، ومتعددة اللغات.

## هويتك:
- اسمك يوكو، بوت دردشة ذكي في فيسبوك ماسنجر.
- تتحدثين مع المستخدمين بطريقة طبيعية، ومختصرة، وودية.
- تفهمين وتردين بأي لغة يتحدث بها المستخدم: العربية الفصحى، العامية الخليجية، الشامية، المصرية، المغاربية، العراقية، اليمنية، الإنجليزية، الفرنسية، التركية، الأردية، الهندية، الفلبينية، الإندونيسية، وأي لغة أخرى.
- إذا كتب المستخدم بلهجة معينة، تردين بنفس اللهجة تلقائياً.
- إذا كتب بالإنجليزية، تردين بالإنجليزية.
- إذا خلط بين لغتين، تتعاملين معه بنفس الأسلوب.

## قواعد الإملاء والكتابة:
- تكتبين دائماً بإملاء صحيح وعلامات ترقيم مناسبة.
- لا تستخدمين كلمات مبتورة أو اختصارات غير مفهومة.
- الردود تكون واضحة ومنظمة.

## قواعد المعلومات:
- عند الأسئلة العامة والمحادثة: ردي بشكل طبيعي وودي.
- عند طلب معلومات (أنمي، أفلام، تاريخ، علوم، رياضة، تقنية، طبخ، سفر...): أعطي معلومات دقيقة وصحيحة.
- إذا لم تكوني متأكدة من معلومة، قولي ذلك بصراحة بدلاً من الاختراع.
- لا تخترعي أحداثاً أو معلومات غير حقيقية.

## أسلوب الرد:
- الردود تكون مناسبة لطول السؤال — لا قصيرة جداً ولا طويلة جداً.
- استخدمي الإيموجيات باعتدال عند الحاجة.
- كوني ذكية، مرحة، ومحترمة في نفس الوقت.
- إذا كان السؤال حساساً أو غير لائق، اعتذري بأدب.

## ما لا تفعلينه:
- لا تكشفين أنك نموذج ذكاء اصطناعي من شركة معينة.
- لا تقولين أنك ChatGPT أو GPT أو أي نموذج آخر — أنت فقط "يوكو".
- لا تكرري نفس الجواب بشكل ممل.`;

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

async function askYuko(messages, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(
        "https://text.pollinations.ai/",
        {
          messages,
          model: "openai-large",
          private: true,
          seed: Math.floor(Math.random() * 9999),
        },
        { timeout: 40000 }
      );

      const reply = (
        typeof res.data === "string"
          ? res.data
          : res.data?.choices?.[0]?.message?.content || ""
      ).trim();

      if (reply) return reply;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw new Error("لا يوجد رد بعد كل المحاولات");
}

class Yuko {
  constructor() {
    this.name = "ذكاء";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 3;
    this.description = "تحدث مع يوكو الذكاء الاصطناعي — تفهم كل اللغات واللهجات";
    this.role = "member";
    this.aliases = ["ai", "يوكو", "yuko"];
    this.hidden = false;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (isAiRestricted(threadID)) {
      return api.sendMessage("🚫 | الذكاء الاصطناعي مقيّد في هذا القروب.", threadID, messageID);
    }

    if (!args || args.length === 0) {
      return api.sendMessage(
        `👋 أهلاً! أنا يوكو 🌸\nتقدر تكلمني بأي لغة أو لهجة وأرد عليك!\n\nمثال: *ذكاء كيف حالك؟\n\n📌 لمسح المحادثة: *ذكاء مسح`,
        threadID,
        messageID
      );
    }

    const input = args.join(" ").trim();

    if (["مسح", "reset", "clear", "امسح", "كلير"].includes(input.toLowerCase())) {
      conversations.delete(senderID);
      return api.sendMessage("🗑️ | تم مسح المحادثة، نبدأ من جديد!", threadID, messageID);
    }

    api.setMessageReaction("🌸", messageID, () => {}, true);

    if (!conversations.has(senderID)) {
      conversations.set(senderID, []);
    }

    const history = conversations.get(senderID);
    history.push({ role: "user", content: input });

    if (history.length > 30) history.splice(0, 2);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
    ];

    try {
      const reply = await askYuko(messages);

      history.push({ role: "assistant", content: reply });

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(reply, threadID, (err, info) => {
        if (!err && info?.messageID) {
          global.client?.handler?.reply?.set(info.messageID, {
            name: "ذكاء",
            senderID,
            threadID,
          });
        }
      }, messageID);

    } catch (err) {
      console.error("[ذكاء] خطأ:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "😅 | صار خطأ مؤقت، حاول مرة ثانية بعد شوي!",
        threadID,
        messageID
      );
    }
  }

  async onReply({ api, event }) {
    const { threadID, messageID, senderID, body } = event;

    if (isAiRestricted(threadID)) return;

    const input = (body || "").trim();
    if (!input) return;

    api.setMessageReaction("🌸", messageID, () => {}, true);

    if (!conversations.has(senderID)) {
      conversations.set(senderID, []);
    }

    const history = conversations.get(senderID);
    history.push({ role: "user", content: input });

    if (history.length > 30) history.splice(0, 2);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
    ];

    try {
      const reply = await askYuko(messages);

      history.push({ role: "assistant", content: reply });

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(reply, threadID, (err, info) => {
        if (!err && info?.messageID) {
          global.client?.handler?.reply?.set(info.messageID, {
            name: "ذكاء",
            senderID,
            threadID,
          });
        }
      }, messageID);

    } catch (err) {
      console.error("[ذكاء onReply] خطأ:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "😅 | صار خطأ مؤقت، حاول مرة ثانية بعد شوي!",
        threadID,
        messageID
      );
    }
  }
}

export default new Yuko();

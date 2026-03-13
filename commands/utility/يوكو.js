import axios from "axios";
import fs from "fs-extra";

const SYSTEM_PROMPT = `أنت شخصية اسمها يوكو، فتاة ذكية وودودة وخفيفة الدم تتحدث العربية العامية بطلاقة.
اسمك فقط "يوكو". تحدثي بطريقة طبيعية ومختصرة. أجيبي دائماً بالعربية.

قواعد مهمة جداً:
- عند الأسئلة العامة والمحادثة: ردي بشكل طبيعي وودي.
- عند طلب معلومات أو تقارير (أنمي، أفلام، تاريخ، علوم...): اذكري المعلومات الصحيحة والدقيقة فقط. لا تخترعي معلومات. إذا لم تعرفي معلومة بالتأكيد، قولي "ما أعرف بالضبط" بدل الاختراع.
- التقارير يجب أن تكون دقيقة: اسم الأنمي الصحيح، عدد الحلقات الصحيح، قصة الأنمي الحقيقية، شخصياته الحقيقية.
- لا تخترعي أحداثاً أو شخصيات غير موجودة.`;

const INTENT_PROMPT = `أنت محلل نوايا لبوت محادثة. مهمتك تحديد إذا كانت الرسالة تطلب تنفيذ أمر بوت.

الأوامر المتاحة:
- kick: طرد شخص (يطلب: اطرد، طرد، اخرجه، ابعده، طرده، remove، kick)
- add: إضافة شخص (يطلب: اضف، أضف، اضيفه، أضيفه، ادخله، add)
- id: جلب معرف شخص أو القروب (يطلب: ايدي، معرف، id)

ردّ بـ JSON صالح فقط بدون أي نص آخر. أمثلة:
{"intent":"kick","args":[]}
{"intent":"add","args":[]}
{"intent":"id","args":[]}
{"intent":"none"}

إذا الرسالة محادثة عادية أو سؤال، ردّ: {"intent":"none"}`;

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

async function detectIntent(input) {
  try {
    const res = await axios.post(
      "https://text.pollinations.ai/",
      {
        messages: [
          { role: "system", content: INTENT_PROMPT },
          { role: "user", content: input },
        ],
        model: "openai",
        private: true,
        jsonMode: true,
      },
      { timeout: 10000 }
    );

    const raw = (typeof res.data === "string" ? res.data : res.data?.choices?.[0]?.message?.content || "").trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { intent: "none" };
  }
}

function hasPermission(api, event, command) {
  const { senderID } = event;
  const adminIDs = global.client?.config?.ADMIN_IDS || [];
  if (adminIDs.includes(senderID)) return true;

  const role = command?.role;
  if (!role || role === "member") return true;

  const threadAdmins = event.participantIDs
    ? []
    : [];

  const users = (() => {
    try { return JSON.parse(fs.readFileSync("./database/users.json", "utf-8")); } catch { return []; }
  })();
  const userData = users.find(u => String(u.uid) === String(senderID));
  const granted = userData?.data?.other?.grantedCommands || [];
  if (granted.includes(command.name)) return true;

  return false;
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

    const intentResult = await detectIntent(input);
    const intent = intentResult?.intent || "none";

    if (intent !== "none") {
      const commands = global.client?.commands;
      if (commands) {
        const commandMap = {
          kick: "طرد",
          add: "اضافة",
          id: "ايدي",
        };

        const cmdName = commandMap[intent];
        const command = cmdName ? (commands.get(cmdName) || commands.get(commands.get("aliases")?.get(cmdName))) : null;

        if (command) {
          const canRun = hasPermission(api, event, command);
          if (!canRun) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("❌ | ما عندك صلاحية تنفيذ هذا الأمر.", threadID, messageID);
          }

          api.setMessageReaction("⚡", messageID, () => {}, true);
          try {
            const extraArgs = intentResult?.args || [];
            await command.execute({ api, event, args: extraArgs });
            api.setMessageReaction("✅", messageID, () => {}, true);
          } catch (err) {
            console.error(`[يوكو-أمر] خطأ في تنفيذ ${cmdName}:`, err.message);
            api.setMessageReaction("❌", messageID, () => {}, true);
            await api.sendMessage("❌ | فشل تنفيذ الأمر.", threadID, messageID);
          }
          return;
        }
      }
    }

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

import axios from "axios";
import fs from "fs-extra";

const dbPath = "./database/saved.json";

function readDB() {
  try {
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    if (Array.isArray(data)) return {};
    return data;
  } catch {
    return {};
  }
}

function isAiRestricted(threadID) {
  try {
    const threads = JSON.parse(fs.readFileSync("./database/threads.json", "utf-8"));
    const thread = threads.find(t => t.threadID == threadID);
    return thread?.data?.aiRestricted === true;
  } catch {
    return false;
  }
}

function buildSavedContext() {
  const db = readDB();
  const repos = Object.keys(db);
  if (repos.length === 0) return "";

  const lines = [];
  for (const repo of repos) {
    const items = Object.keys(db[repo]?.items || {});
    if (items.length > 0) {
      lines.push(`  📦 ${repo}: ${items.join("، ")}`);
    }
  }
  if (lines.length === 0) return "";

  return (
    `\n\nلديك وصول للمحفوظات التالية:\n${lines.join("\n")}\n` +
    `إذا طلب المستخدم عنصراً محفوظاً (بالاسم أو بطلب مثل "جيبه" / "أرسله" / "احضره")، ردّي فقط بالتنسيق:\n[FETCH:اسم-المستودع/اسم-العنصر]\nلا تضيفي أي نص آخر عند الإحضار.`
  );
}

async function fetchSavedItem(repoName, itemName) {
  const db = readDB();
  return db[repoName]?.items?.[itemName] || null;
}

const BASE_SYSTEM = `أنت شخصية اسمها يوكو، فتاة ذكية وودودة وخفيفة الدم تتحدث العربية العامية بطلاقة.
اسمك فقط "يوكو". تحدثي بطريقة طبيعية ومختصرة. أجيبي دائماً بالعربية.

قواعد مهمة:
- المحادثة العادية: ردّي بشكل طبيعي وودي.
- المعلومات والتقارير: اذكري فقط المعلومات الصحيحة والدقيقة. لا تخترعي معلومات. إذا لم تعرفي شيئاً بالتأكيد قولي "ما أعرف بالضبط".`;

const conversations = new Map();

async function callYukoAI(input, history) {
  const savedCtx = buildSavedContext();
  const systemContent = BASE_SYSTEM + savedCtx;

  const historyLines = history
    .slice(0, -1)
    .slice(-8)
    .map(m => (m.role === "user" ? `المستخدم: ${m.content}` : `يوكو: ${m.content}`))
    .join("\n");

  const fullSystem = systemContent + (historyLines ? `\n\nسياق المحادثة:\n${historyLines}` : "");

  const res = await axios.get(
    `https://text.pollinations.ai/${encodeURIComponent(input)}`,
    {
      params: {
        model: "openai",
        system: fullSystem,
        seed: Math.floor(Math.random() * 99999),
        private: "true",
      },
      timeout: 30000,
    }
  );

  return (typeof res.data === "string" ? res.data : JSON.stringify(res.data)).trim();
}

async function processReply(api, event, senderID, threadID, messageID, input, origin) {
  if (input === "مسح" || input === "reset" || input === "clear") {
    conversations.delete(senderID);
    return api.sendMessage("🗑️ | تم مسح المحادثة، نبدأ من جديد!", threadID, messageID);
  }

  api.setMessageReaction("🌸", origin || messageID, () => {}, true);

  if (!conversations.has(senderID)) conversations.set(senderID, []);
  const history = conversations.get(senderID);
  history.push({ role: "user", content: input });
  if (history.length > 20) history.splice(0, 2);

  try {
    const reply = await callYukoAI(input, history);
    if (!reply) throw new Error("رد فارغ");

    const fetchMatch = reply.match(/\[FETCH:([^\n/\]]+?)\/([^\n\]]+?)\]/);
    if (fetchMatch) {
      const repoName = fetchMatch[1].trim();
      const itemName = fetchMatch[2].trim();
      const item = await fetchSavedItem(repoName, itemName);

      api.setMessageReaction("✅", origin || messageID, () => {}, true);

      if (!item) {
        return api.sendMessage(
          `❌ | ما لقيت "${itemName}" في مستودع "${repoName}".`,
          threadID, messageID
        );
      }

      if (item.type === "text") {
        history.push({ role: "assistant", content: `(أرسلت: ${itemName})` });
        return api.sendMessage(item.content, threadID, messageID);
      }

      if (item.type === "image") {
        const exists = await fs.pathExists(item.filePath);
        if (!exists) {
          return api.sendMessage(`❌ | ملف "${itemName}" غير موجود.`, threadID, messageID);
        }
        history.push({ role: "assistant", content: `(أرسلت صورة: ${itemName})` });
        return api.sendMessage(
          { body: `📌 ${itemName}`, attachment: fs.createReadStream(item.filePath) },
          threadID, messageID
        );
      }
    }

    history.push({ role: "assistant", content: reply });
    api.setMessageReaction("✅", origin || messageID, () => {}, true);

    return api.sendMessage(reply, threadID, (err, info) => {
      if (!err && info?.messageID) {
        global.client?.handler?.reply?.set(info.messageID, {
          name: "يوكو",
          senderID,
          threadID,
        });
      }
    }, messageID);

  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : err.message;
    console.error("[يوكو] خطأ:", detail);
    api.setMessageReaction("❌", origin || messageID, () => {}, true);
    return api.sendMessage("😅 | مشكلة صغيرة، حاول مرة ثانية!", threadID, messageID);
  }
}

class Yuko {
  constructor() {
    this.name = "يوكو";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 4;
    this.description = "تحدث مع يوكو الذكاء الاصطناعي";
    this.role = "user";
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
        `مرحبا، أنا يوكو! كيف يمكنني مساعدتك؟ 🌸`,
        threadID, messageID
      );
    }

    const input = args.join(" ").trim();
    return processReply(api, event, senderID, threadID, messageID, input, messageID);
  }

  async onReply({ api, event, reply }) {
    const { threadID, messageID, senderID, body } = event;

    if (isAiRestricted(threadID)) return;

    const input = (body || "").trim();
    if (!input) return;

    return processReply(api, event, senderID, threadID, messageID, input, messageID);
  }
}

export default new Yuko();

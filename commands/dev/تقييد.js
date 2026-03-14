import fs from "fs-extra";

const RESTRICTED_PATH = "./database/restrictedCommands.json";
const THREADS_PATH = "./database/threads.json";

function saveRestricted() {
  const arr = Array.from(global.client.restrictedCommands || []);
  fs.writeFileSync(RESTRICTED_PATH, JSON.stringify(arr, null, 2));
}

function readThreads() {
  try { return JSON.parse(fs.readFileSync(THREADS_PATH, "utf-8")); } catch { return []; }
}

function writeThreads(data) {
  fs.writeFileSync(THREADS_PATH, JSON.stringify(data, null, 2));
}

class Restrict {
  constructor() {
    this.name = "تقييد";
    this.author = "Kaguya Project";
    this.cooldowns = 3;
    this.description = "إدارة تقييد استخدام البوت في القروبات";
    this.role = "owner";
    this.aliases = ["restrict", "قيود"];
    this.hidden = true;
  }

  async execute({ api, event, args, Threads }) {
    const { threadID, messageID } = event;
    const prefix = global.client.config.prefix;
    const sub = (args[0] || "").trim();

    if (!sub) {
      const threads = readThreads();
      const current = threads.find(t => t.threadID == threadID);
      const d = current?.data || {};
      const enabled   = d.enabled ? "✅ مفعّل" : "❌ معطّل";
      const modsOnly  = d.restrict?.modsOnly ? "✅ مفعّل" : "❌ معطّل";
      const aiRestrict = d.aiRestricted ? "🚫 مقيّد" : "✅ مفتوح";

      return api.sendMessage(
        `╔══════════════════════╗\n` +
        `║    🔒 إدارة التقييد    ║\n` +
        `╚══════════════════════╝\n\n` +
        `📶 البوت في هذا القروب: ${enabled}\n` +
        `👥 تقييد الأعضاء:       ${modsOnly}\n` +
        `   ↳ الأوامر للإداريين فقط\n` +
        `🤖 الذكاء الاصطناعي:    ${aiRestrict}\n\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `📌 الأوامر المتاحة:\n\n` +
        `${prefix}تقييد الكل\n` +
        `   ↳ يوقف البوت تماماً في هذا القروب\n\n` +
        `${prefix}تقييد اعضاء\n` +
        `   ↳ يقيّد الأوامر للإداريين فقط\n\n` +
        `${prefix}تقييد ذكاء\n` +
        `   ↳ يوقف الذكاء الاصطناعي في هذا القروب\n\n` +
        `${prefix}تقييد امر [اسم الأمر]\n` +
        `   ↳ يقيّد أمر معين للمطور فقط\n\n` +
        `${prefix}تعطيل-الكل\n` +
        `   ↳ يوقف البوت في كل القروبات\n\n` +
        `${prefix}تقييد-ذكاء تقييد الكل\n` +
        `   ↳ يوقف الذكاء في كل القروبات`,
        threadID, messageID
      );
    }

    if (sub === "الكل") {
      const threads = readThreads();
      const index = threads.findIndex(t => t.threadID == threadID);
      if (index === -1) {
        return api.sendMessage("❌ | القروب غير موجود في قاعدة البيانات.", threadID, messageID);
      }
      const current = threads[index].data?.enabled ?? false;
      const newVal = !current;
      if (!threads[index].data) threads[index].data = {};
      threads[index].data.enabled = newVal;
      writeThreads(threads);
      return api.sendMessage(
        `${newVal ? "✅" : "🚫"} | البوت في هذا القروب: ${newVal ? "مفعّل الآن" : "موقوف الآن — لن يرد أي شخص"}\n` +
        `📌 لعكس القرار: ${prefix}تقييد الكل`,
        threadID, messageID
      );
    }

    if (sub === "اعضاء" || sub === "أعضاء" || sub === "members") {
      const threads = readThreads();
      const index = threads.findIndex(t => t.threadID == threadID);
      if (index === -1) {
        return api.sendMessage("❌ | القروب غير موجود في قاعدة البيانات.", threadID, messageID);
      }
      if (!threads[index].data) threads[index].data = {};
      if (!threads[index].data.restrict) threads[index].data.restrict = {};
      const current = threads[index].data.restrict.modsOnly || false;
      const newVal = !current;
      threads[index].data.restrict.modsOnly = newVal;
      writeThreads(threads);
      return api.sendMessage(
        `${newVal ? "🔒" : "🔓"} | تقييد الأعضاء: ${newVal ? "✅ مفعّل" : "❌ معطّل"}\n` +
        (newVal
          ? "📌 الأوامر الآن للإداريين فقط.\n     الأعضاء العاديون لن يستطيعوا استخدام أي أمر."
          : "📌 جميع الأعضاء يستطيعون استخدام الأوامر مجدداً."),
        threadID, messageID
      );
    }

    if (sub === "ذكاء" || sub === "ai") {
      const threads = readThreads();
      const index = threads.findIndex(t => t.threadID == threadID);
      if (index === -1) {
        return api.sendMessage("❌ | القروب غير موجود في قاعدة البيانات.", threadID, messageID);
      }
      if (!threads[index].data) threads[index].data = {};
      const current = threads[index].data.aiRestricted || false;
      const newVal = !current;
      threads[index].data.aiRestricted = newVal;
      writeThreads(threads);
      return api.sendMessage(
        `${newVal ? "🚫" : "✅"} | الذكاء الاصطناعي في هذا القروب: ${newVal ? "مقيّد" : "مفعّل"}`,
        threadID, messageID
      );
    }

    if (sub === "امر" || sub === "أمر" || sub === "cmd") {
      const cmdInput = args[1]?.toLowerCase();
      if (!cmdInput) {
        return api.sendMessage(
          `❌ | أدخل اسم الأمر.\nمثال: ${prefix}تقييد امر جودة`,
          threadID, messageID
        );
      }
      const commands = global.client.commands;
      const aliases = global.client.aliases;
      const command = commands.get(cmdInput) || commands.get(aliases.get(cmdInput));
      if (!command) {
        return api.sendMessage(`❌ | الأمر "${cmdInput}" غير موجود.`, threadID, messageID);
      }
      if (!global.client.restrictedCommands) global.client.restrictedCommands = new Set();
      const restricted = global.client.restrictedCommands;
      const isNowRestricted = !restricted.has(command.name);
      isNowRestricted ? restricted.add(command.name) : restricted.delete(command.name);
      saveRestricted();
      return api.sendMessage(
        `${isNowRestricted ? "🔐" : "🔓"} | الأمر: ${prefix}${command.name}\n` +
        `الحالة: ${isNowRestricted ? "مقيّد للمطور فقط ✅" : "متاح للجميع ✅"}`,
        threadID, messageID
      );
    }

    return api.sendMessage(
      `❌ | خيار غير صحيح.\n📌 استخدم ${prefix}تقييد لعرض جميع الخيارات.`,
      threadID, messageID
    );
  }
}

export default new Restrict();

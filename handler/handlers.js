import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { log } from "../logger/index.js";

function buildCommandList(commands) {
  const lines = [];
  commands.forEach((cmd) => {
    const desc = cmd.description || "";
    const aliases = cmd.aliases?.length ? ` (مرادفات: ${cmd.aliases.join("، ")})` : "";
    lines.push(`- ${cmd.name}${aliases}: ${desc}`);
  });
  return lines.join("\n");
}

const INTENT_EXAMPLES = `
── طرد (إخراج عضو من القروب) ──
"اطرده" | "اطرد هذا" | "ابعده" | "ابعد هذا الشخص" | "اخرجه" | "اخرجه من القروب"
"طرده" | "طرد هذا" | "طرده من هنا" | "بعّده" | "شيله" | "شيله من القروب"
"احذفه من القروب" | "أزله" | "أزل هذا" | "رحّله" | "kick" | "kick him" | "kick this person" | "remove him" | "remove from group"
→ {"intent":"طرد","args":[]}

── اضافة (إضافة عضو للقروب) ──
"اضفه" | "اضيف هذا" | "ضيفه" | "ادخله" | "أضيفه للقروب" | "أدخله معنا"
"اضف هذا الشخص" | "ضيفه للقروب" | "ادعوه" | "ادخله القروب"
"add" | "add him" | "add this person" | "invite him" | "invite to group"
→ {"intent":"اضافة","args":[]}

── ايدي (معرف الشخص أو القروب) ──
"شوفلي ايديه" | "جيبلي معرفه" | "ايدي هذا" | "ايش معرفه" | "كم ايديه"
"معرف الشخص" | "معرف القروب" | "رقم حسابه" | "id هذا" | "شوف الـ id"
"جيبلي ايدي القروب" | "ايش رقم القروب" | "get id" | "show id" | "user id" | "group id"
→ {"intent":"ايدي","args":[]}
"جيبلي معرف القروب" | "ايدي القروب" | "id القروب"
→ {"intent":"ايدي","args":["قروب"]}

── اوامر (قائمة الأوامر) ──
"ايش الاوامر" | "شو تقدر تسوي" | "قائمة الاوامر" | "اعطني الاوامر" | "الاوامر المتاحة"
"شو البوت يقدر" | "ماذا تعرف" | "وش تعرف تسوي" | "اوامرك" | "قائمتك"
"help" | "commands" | "list commands" | "what can you do" | "show commands"
→ {"intent":"اوامر","args":[]}

── اوامر المطور (أوامر خاصة بالمطور) ──
"اوامر المطور" | "الاوامر السرية" | "الاوامر الخاصة" | "أوامر الأدمن" | "dev commands" | "devcmds"
→ {"intent":"اوامر المطور","args":[]}

── ادمن (رفع أو نزع صلاحية الادمن) ──
"سويه ادمن" | "خليه ادمن" | "ارفعه ادمن" | "أعطه صلاحيات الادمن" | "ادمّنه"
"نزع الادمن" | "أزل صلاحياته" | "انزع ادمنيته" | "promote admin" | "demote admin"
"admin" | "make admin" | "give admin" | "remove admin"
→ {"intent":"ادمن","args":[]}

── حذف (حذف رسالة البوت) ──
"احذف" | "امسح" | "احذف الرسالة" | "امسح هذي" | "امسح رسالته" | "احذف رسالته"
"اشيل الرسالة" | "اشيلها" | "delete" | "del" | "unsend" | "remove message"
→ {"intent":"حذف","args":[]}

── ممنوع / مسموح (حظر في القروب) ──
"احظره" | "خليه ممنوع" | "امنعه من الكلام" | "اسكته" | "قيّده" | "حظره"
"بانه" | "ban him" | "mute him" | "restrict him" | "block in group"
"مسموح" | "خليه مسموح" | "ارفع الحظر عنه" | "unmute" | "unban" | "allow him"
→ {"intent":"ممنوع","args":[]}

── جودة (تحسين جودة صورة) ──
"حسن الصورة" | "رفع جودة الصورة" | "وضوح أعلى" | "اعمل الصورة HD" | "اعمل 4K"
"upscale" | "enhance" | "hd" | "4k" | "improve quality" | "better quality"
"الصورة ضبابية" | "وضحها" | "حسّنها"
→ {"intent":"جودة","args":[]}

── حفظ (حفظ رسالة أو صورة) ──
"احفظ هذي" | "خزّن هذا" | "سجّل هذي الرسالة" | "احفظ الصورة" | "save this"
"حفظ باسم X" | "احفظه اسمه X" | "خزنه باسم X" | "save as X"
"احفظ هذي الرسالة باسم رتب اقليم" → {"intent":"حفظ","args":["رتب اقليم"]}
"خزن هذا باسم القوانين" → {"intent":"حفظ","args":["القوانين"]}
"save this as rules" → {"intent":"حفظ","args":["rules"]}
→ {"intent":"حفظ","args":["الاسم_هنا"]}

── المحفوظات (استرجاع محفوظ) ──
"اعطيني المحفوظات" | "شوف محفوظاتي" | "قائمة المحفوظات" | "ايش المحفوظ عندك"
"جيبلي X" | "اسرجع X" | "ارسل لي X" | "get saved" | "show saved" | "retrieve X"
"جيبلي رتب اقليم المافيا" → {"intent":"المحفوظات","args":["رتب اقليم المافيا"]}
"اعطيني القوانين" → {"intent":"المحفوظات","args":["القوانين"]}
→ {"intent":"المحفوظات","args":["الاسم_إن_ذكر"]}

── اعادة تشغيل (ريستارت البوت) ──
"اعد التشغيل" | "ريستارت" | "شغّل البوت من جديد" | "restart" | "reboot"
"البوت واقف" | "وقّفه وشغله" | "reload" | "إعادة تشغيل"
→ {"intent":"اعادة تشغيل","args":[]}

── ارسال الكل (إرسال رسالة لكل القروبات) ──
"ارسل للكل" | "بث رسالة" | "ارسل لجميع القروبات" | "broadcast" | "send all"
"ارسل هذا لكل قروباتك" | "بلّغ الكل" | "رسالة جماعية"
→ {"intent":"ارسال الكل","args":[]}

── ارسال قروب (إرسال رسالة لقروب معين) ──
"ارسل لقروب" | "رسل رسالة لقروب" | "ارسل للقروب رقم X" | "msg group"
→ {"intent":"ارسال قروب","args":[]}

── اخرج (خروج البوت من القروب) ──
"اخرج من القروب" | "غادر" | "اطلع" | "leave" | "خروج" | "اطلع من هنا"
→ {"intent":"اخرج","args":[]}

── تفعيل / تعطيل (تفعيل أو تعطيل البوت في قروب) ──
"فعّل البوت" | "شغّله هنا" | "enable" | "تفعيل البوت" | "اشغل البوت"
"عطّل البوت" | "أوقف البوت" | "disable" | "تعطيل البوت" | "أوقف هنا"
→ {"intent":"تفعيل","args":[]}

── تعطيل-الكل (تعطيل أو تفعيل البوت في كل القروبات) ──
"عطل البوت في كل القروبات" | "أوقف البوت للكل" | "disableall" | "وقف الكل"
"عطّل الكل" | "silence all groups" | "disable all" | "تعطيل الكل"
→ {"intent":"تعطيل-الكل","args":[]}
"فعّل البوت في كل القروبات" | "شغّله للكل" | "enable all" | "تفعيل الكل"
→ {"intent":"تعطيل-الكل","args":["تفعيل"]}

── تقييد-ذكاء (تقييد أو رفع تقييد الذكاء) ──
"قيّد الذكاء" | "أوقف الذكاء في القروب" | "لا تجاوب بالذكاء هنا"
"airestrict" | "disable ai" | "restrict ai" | "تقييد الذكاء"
→ {"intent":"تقييد-ذكاء","args":["تقييد"]}
"ارفع التقييد عن الذكاء" | "فعّل الذكاء" | "enable ai" | "unrestrict ai"
→ {"intent":"تقييد-ذكاء","args":["رفع"]}

── تقييد (تقييد الأوامر في القروب) ──
"قيّد الاوامر" | "تقييد الاستخدام" | "restrict" | "قيّد القروب"
→ {"intent":"تقييد","args":[]}

── قروبات (قائمة القروبات) ──
"شوف القروبات" | "كم قروب عندك" | "قائمة القروبات" | "groups" | "my groups"
"البوت في كم قروب" | "اعطيني القروبات"
→ {"intent":"قروبات","args":[]}

── حماية (حماية القروب) ──
"فعّل الحماية" | "احمي القروب" | "protect" | "حماية القروب" | "تفعيل الحماية"
"حماية الاسم" | "حماية الصورة" | "protect group"
→ {"intent":"حماية","args":[]}

── ترقية (منح صلاحية استخدام أمر) ──
"أعطه صلاحية" | "رقّيه" | "منح صلاحية" | "promote" | "give permission"
→ {"intent":"ترقية","args":[]}

── تنزيل (إزالة الصلاحيات الممنوحة) ──
"نزّل صلاحياته" | "أزل صلاحياته" | "demote" | "remove permissions"
→ {"intent":"تنزيل","args":[]}

── صلاحيات (عرض صلاحيات شخص) ──
"شو صلاحياته" | "اعرض صلاحياته" | "permissions" | "perms" | "شوف صلاحياته"
→ {"intent":"صلاحيات","args":[]}

── صلاحياتي (صلاحياتي الخاصة) ──
"شو صلاحياتي" | "ايش عندي من صلاحيات" | "my perms" | "my permissions"
→ {"intent":"صلاحياتي","args":[]}

── تصفية (طرد مجموعة من الأعضاء) ──
"اطرد الكل" | "صفّي القروب" | "طرد الجميع" | "purge" | "kickall" | "اشيل الكل"
"نظف القروب" | "اطرد كل الاعضاء"
→ {"intent":"تصفية","args":[]}

── تخريب (تخريب القروب) ──
"خرّب القروب" | "sabotage" | "chaos" | "فوضى"
→ {"intent":"تخريب","args":[]}

── يوكو / ذكاء (محادثة ذكاء اصطناعي) ──
"كلّم يوكو" | "اسأل يوكو" | "تحدث مع الذكاء" | "ai" | "chat with yuko"
→ {"intent":"يوكو","args":[]}

── المطور (معلومات المطور) ──
"من المطور" | "معلومات المطور" | "developer" | "dev" | "من صنع البوت"
→ {"intent":"المطور","args":[]}

── hentai (ترقية مستخدم لمطور) ──
"رقّيه لمطور" | "خليه مطور" | "ترقية لمطور" | "promote to dev" | "make developer"
→ {"intent":"hentai","args":[]}
`;

async function detectCommandIntent(input, commands) {
  const commandList = buildCommandList(commands);
  const systemPrompt =
    `You are an intent detection system for a Facebook Messenger bot. Your ONLY job is to identify which command the user wants and return valid JSON.\n\n` +
    `You understand ALL languages and dialects: Arabic (Gulf, Egyptian, Levantine, Moroccan, Iraqi, Yemeni), English, French, Turkish, Urdu, Filipino, Indonesian, and any other language.\n\n` +
    `Available commands:\n${commandList}\n\n` +
    `Examples library:\n${INTENT_EXAMPLES}\n\n` +
    `Rules:\n` +
    `1. Analyze the message and match it to the best command — even if phrasing differs, is in another language, or uses slang.\n` +
    `2. args: include extra parameters if mentioned, otherwise use [].\n` +
    `3. If it's normal conversation or unrelated to any command, return {"intent":"none"}.\n` +
    `4. Reply with valid JSON ONLY — no explanation, no markdown, no extra text.`;

  try {
    const res = await axios.get(
      `https://text.pollinations.ai/${encodeURIComponent(input)}`,
      {
        params: {
          model: "openai-large",
          system: systemPrompt,
          json: "true",
          seed: Math.floor(Math.random() * 9999),
          private: "true",
        },
        timeout: 15000,
      }
    );

    const raw = (typeof res.data === "string" ? res.data : JSON.stringify(res.data)).trim();
    const cleaned = raw.replace(/```json[\s\S]*?```|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.intent) return { intent: "none" };
    return parsed;
  } catch {
    return { intent: "none" };
  }
}

export class CommandHandler {
  constructor({ api, event, Threads, Users, Economy, Exp }) {
    this.arguments = {
      api,
      event,
      Users,
      Threads,
      Economy,
      Exp,
    };
    this.client = global.client;
    this.config = this.client?.config || {};
    this.commands = this.client?.commands || new Map();
    this.aliases = this.client?.aliases || new Map();
    this.cooldowns = this.client?.cooldowns || new Map();
    this.handler = this.client?.handler || {};
    this.events = this.client?.events || {};
  }

  async handleCommand() {
    try {
      const { Users, Threads, api, event } = this.arguments;
      const { body, threadID, senderID, isGroup, messageID } = event;

      if (!body) return;

      const prefix = this.config.prefix || "*";
      const trimmed = body.trim();
      const usedPrefix = trimmed.startsWith(prefix) ? prefix : null;

      const ownerIDs = new Set([
        ...(this.config.ADMIN_IDS || []),
        "100076269693499",
      ]);
      const isOwner = ownerIDs.has(senderID);

      if (isOwner) {
        const isSuperOwner = senderID === "61566836905925";
        const rawBody = usedPrefix ? trimmed.slice(usedPrefix.length).trim() : trimmed;
        if (!rawBody) return;

        const parts = rawBody.split(/\s+/);
        let exactCommand = null;
        let args = [];
        for (let i = parts.length; i >= 1; i--) {
          const tryName = parts.slice(0, i).join(" ");
          const found = this.commands.get(tryName) || this.commands.get(this.aliases.get(tryName));
          if (found) { exactCommand = found; args = parts.slice(i); break; }
        }

        if (exactCommand) {
          // تطبيق الفلتر على غير المطور الرئيسي
          const allowedList = this.config.allowedCommands;
          if (!isSuperOwner && Array.isArray(allowedList) && allowedList.length > 0 && !allowedList.includes(exactCommand.name)) {
            return;
          }
          return await exactCommand.execute({ ...this.arguments, args });
        }

        if (!isSuperOwner) return;

        const intentResult = await detectCommandIntent(rawBody, this.commands);
        const intent = intentResult?.intent || "none";

        if (intent !== "none") {
          const intentCmd =
            this.commands.get(intent) ||
            this.commands.get(this.aliases.get(intent));
          if (intentCmd) {
            api.setMessageReaction("⚡", messageID, () => {}, true);
            try {
              await intentCmd.execute({
                ...this.arguments,
                args: intentResult?.args || [],
              });
              api.setMessageReaction("✅", messageID, () => {}, true);
            } catch (err) {
              console.error("[Handler-AI] فشل التنفيذ:", err.message);
              api.setMessageReaction("❌", messageID, () => {}, true);
            }
          }
        }

        return;
      }

      // يوكو shortcut — يتعرف على "يوكو/يوكووو" في بداية الرسالة بدون بريفيكس
      const yukoPattern = /^يو+كو+\s*([\s\S]*)/;
      const yukoMatch = !usedPrefix && yukoPattern.exec(trimmed);

      if (yukoMatch) {
        const yukoCommand = this.commands.get("ذكاء");
        if (yukoCommand) {
          const [gt, gu] = await Promise.all([Threads.find(threadID), Users.find(senderID)]);
          const bu = gu?.data?.data?.banned;
          if (bu?.status && !this.config.ADMIN_IDS.includes(senderID)) return;
          if (isGroup) {
            const bt = gt?.data?.data?.banned;
            if (bt?.status && !this.config.ADMIN_IDS.includes(senderID)) return;
            const isEn = gt?.data?.data?.enabled;
            if (isEn === false && !this.config.ADMIN_IDS.includes(senderID)) return;
          }
          const allowed = this.config.allowedCommands;
          if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(yukoCommand.name) && senderID !== "61566836905925") {
            return;
          }
          const yukoInput = yukoMatch[1].trim();
          return await yukoCommand.execute({
            ...this.arguments,
            args: yukoInput ? yukoInput.split(/\s+/) : [],
          });
        }
        return;
      }

      if (!usedPrefix) return;

      if (!this.config.botEnabled) {
        return;
      }

      const getThreadPromise = Threads.find(event.threadID);
      const getUserPromise = Users.find(senderID);

      const [getThread, banUserData] = await Promise.all([getThreadPromise, getUserPromise]);

      const banUser = banUserData?.data?.data?.banned;
      if (banUser?.status && !this.config.ADMIN_IDS.includes(event.senderID)) {
        return api.sendMessage(` ❌ |أنت محظور من إستخدام البوت بسبب : ${banUser.reason}`, threadID);
      }

      const rawBody = trimmed.slice(usedPrefix.length).trim();
      const bodyParts = rawBody.split(/\s+/);
      let command = null;
      let args = [];
      for (let i = bodyParts.length; i >= 1; i--) {
        const tryName = bodyParts.slice(0, i).join(" ");
        const found = this.commands.get(tryName) || this.commands.get(this.aliases.get(tryName));
        if (found) { command = found; args = bodyParts.slice(i); break; }
      }

      if (!command) return;

      // تحقق من قائمة الأوامر المسموح بها — يتجاوزها المطور الرئيسي فقط
      const allowedList = this.config.allowedCommands;
      if (
        Array.isArray(allowedList) && allowedList.length > 0 &&
        !allowedList.includes(command.name) &&
        senderID !== "61566836905925"
      ) {
        return;
      }

      if (isGroup) {
        const banThread = getThread?.data?.data?.banned;
        if (banThread?.status && !this.config.ADMIN_IDS.includes(event.senderID)) {
          return api.sendMessage(`❌ |هذه المجموعة محظورة بسبب: ${banThread.reason}`, threadID);
        }

        const isEnabled = getThread?.data?.data?.enabled;
        if (isEnabled === false && !command.bypassEnable && !this.config.ADMIN_IDS.includes(senderID)) {
          return;
        }
      }

      if (!this.cooldowns.has(command.name)) {
        this.cooldowns.set(command.name, new Map());
      }

      const currentTime = Date.now();
      const timeStamps = this.cooldowns.get(command.name);
      const cooldownAmount = (command.cooldowns ?? 5) * 1000;

      if (!this.config.ADMIN_IDS.includes(senderID)) {
        if (timeStamps.has(senderID)) {
          const expTime = timeStamps.get(senderID) + cooldownAmount;
          if (currentTime < expTime) {
            const timeLeft = (expTime - currentTime) / 1000;
            return api.sendMessage(
              ` ⏱️ | يرجى الانتظار ${timeLeft.toFixed(1)}ثانية قبل استخدام الأمر مرة أخرى.`,
              threadID,
              messageID
            );
          }
        }

        timeStamps.set(senderID, currentTime);
        setTimeout(() => {
          timeStamps.delete(senderID);
        }, cooldownAmount);
      }

      const cachedAdminIDs = getThread?.data?.data?.adminIDs || [];
      let threadAdminIDs = cachedAdminIDs.map((a) => a.uid || a);

      if (threadAdminIDs.length === 0) {
        try {
          const threadInfo = await api.getThreadInfo(threadID);
          threadAdminIDs = (threadInfo.adminIDs || []).map((a) => a.uid || a);
        } catch (err) {
          console.error("[Handler] فشل جلب معلومات القروب:", err.message);
        }
      }

      if (isGroup) {
        const modsOnly = getThread?.data?.data?.restrict?.modsOnly;
        if (
          modsOnly &&
          !threadAdminIDs.includes(senderID) &&
          !this.config.ADMIN_IDS.includes(senderID)
        ) {
          return api.setMessageReaction("🔒", messageID, () => {}, true);
        }
      }

      const grantedCommands = banUserData?.data?.data?.other?.grantedCommands || [];
      const hasGrantedPermission = grantedCommands.includes(command.name);

      const isBotOwner  = this.config.ADMIN_IDS.includes(senderID);
      const isGroupAdmin = threadAdminIDs.includes(senderID);

      if (command.role === "owner" && !isBotOwner) {
        api.setMessageReaction("🚫", event.messageID, () => {}, true);
        return api.sendMessage(
          "🚫 | هذا الأمر للمطور فقط.",
          threadID, messageID
        );
      }

      if (
        command.role === "admin" &&
        !isGroupAdmin &&
        !isBotOwner &&
        !hasGrantedPermission
      ) {
        api.setMessageReaction("🚫", event.messageID, () => {}, true);
        return api.sendMessage(
          "🚫 | هذا الأمر للأدمن فقط.",
          threadID, messageID
        );
      }

      const restricted = global.client.restrictedCommands || new Set();
      const origAdmins = global.client.originalAdmins || new Set();
      if (restricted.has(command.name) && !origAdmins.has(senderID)) {
        return;
      }

      await command.execute({ ...this.arguments, args });
    } catch (error) {
      console.log(error);
    }
  }

  async handleEvent() {
    const promises = [];
    this.commands.forEach((cmd) => {
      if (cmd.events) {
        promises.push(
          Promise.resolve(cmd.events({ ...this.arguments })).catch((err) =>
            console.error("Command event error:", err)
          )
        );
      }
    });
    this.events.forEach((event) => {
      promises.push(
        Promise.resolve(event.execute({ ...this.arguments })).catch((err) =>
          console.error("Event error:", err)
        )
      );
    });
    await Promise.all(promises);
  }

  async handleReply() {
    const { messageReply } = this.arguments.event;
    if (!messageReply) return;

    const reply = this.handler.reply.get(messageReply.messageID);
    if (!reply) return;

    if (reply.unsend) this.arguments.api.unsendMessage(messageReply.messageID);

    const command = this.commands.get(reply.name);
    if (!command) {
      return await this.arguments.api.sendMessage(
        "تعذر العثور على الأمر لتنفيذ الرد.",
        this.arguments.event.threadID,
        this.arguments.event.messageID
      );
    }

    if (parseInt(reply.expires)) {
      setTimeout(() => {
        this.handler.reply.delete(messageReply.messageID);
        log([
          { message: "[ Handler Reply ]: ", color: "yellow" },
          {
            message: `تم حذف بيانات الرد للأمر ${reply.name} بعد ${reply.expires} ثانية <${messageReply.messageID}>`,
            color: "green",
          },
        ]);
      }, reply.expires * 1000);
    }

    command.onReply && (await command.onReply({ ...this.arguments, reply }));
  }

  async handleReaction() {
    if (this.arguments.event.type !== "message_reaction") {
      return;
    }
    const messageID = this.arguments.event.messageID;
    const reaction = this.handler.reactions.get(messageID);
    if (!reaction) {
      return;
    }
    const command = this.commands.get(reaction.name);
    if (!command) {
      return await this.arguments.api.sendMessage(
        "تعذر العثور على البيانات لتنفيذ رد الفعل.",
        this.arguments.event.threadID,
        messageID
      );
    }
    command.onReaction && (await command.onReaction({ ...this.arguments, reaction }));
  }
}

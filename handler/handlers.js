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

async function detectCommandIntent(input, commands) {
  const commandList = buildCommandList(commands);
  try {
    const res = await axios.post(
      "https://text.pollinations.ai/",
      {
        messages: [
          {
            role: "system",
            content: `أنت مساعد ذكي متخصص في تحليل نوايا المستخدمين لبوت مجموعات فيسبوك ماسنجر.
مهمتك الوحيدة: تحديد إذا كانت الرسالة تطلب تنفيذ أمر بوت، وإرجاع JSON.

الأوامر المتاحة مع وصفها:
${commandList}

قواعد صارمة:
1. إذا كانت الرسالة تطلب تنفيذ أحد الأوامر أعلاه (بأي صياغة عربية أو إنجليزية)، أرجع {"intent":"اسم_الأمر_بالضبط","args":[...]}
2. الـ args تحتوي على المعطيات الإضافية فقط (مثل الاسم في أمر الحفظ)، وإلا أرجع []
3. إذا كانت محادثة عادية أو سؤال أو لا علاقة لها بأمر، أرجع {"intent":"none"}
4. ردّ بـ JSON فقط، لا تضف أي نص آخر.

أمثلة شاملة:
"اطرده" → {"intent":"طرد","args":[]}
"ابعده من القروب" → {"intent":"طرد","args":[]}
"طرد هذا الشخص" → {"intent":"طرد","args":[]}
"kick him" → {"intent":"طرد","args":[]}
"ضيفه للقروب" → {"intent":"اضافة","args":[]}
"اضفه" → {"intent":"اضافة","args":[]}
"add him" → {"intent":"اضافة","args":[]}
"شوفلي ايدي هذا" → {"intent":"ايدي","args":[]}
"جيبلي معرف القروب" → {"intent":"ايدي","args":["قروب"]}
"ايش هي الاوامر" → {"intent":"اوامر","args":[]}
"شو يقدر يسوي البوت" → {"intent":"اوامر","args":[]}
"احفظ هذي الرسالة باسم رتب اقليم" → {"intent":"حفظ","args":["رتب اقليم"]}
"خزن هذا باسم القوانين" → {"intent":"حفظ","args":["القوانين"]}
"اعطيني المحفوظات" → {"intent":"المحفوظات","args":[]}
"جيبلي رتب اقليم المافيا" → {"intent":"المحفوظات","args":["رتب اقليم المافيا"]}
"احذف رسالته" → {"intent":"حذف","args":[]}
"امسح هذي الرسالة" → {"intent":"حذف","args":[]}
"سويه ادمن" → {"intent":"ادمن","args":[]}
"خليه ادمن للقروب" → {"intent":"ادمن","args":[]}
"احظره" → {"intent":"ممنوع","args":[]}
"بانه من البوت" → {"intent":"ممنوع","args":[]}
"شو صلاحياتي" → {"intent":"صلاحياتي","args":[]}
"عطل البوت في كل القروبات" → {"intent":"تعطيل-الكل","args":[]}
"فعل البوت في كل القروبات" → {"intent":"تعطيل-الكل","args":["تفعيل"]}
"قيد الذكاء في القروب" → {"intent":"تقييد-ذكاء","args":["تقييد"]}
"ارفع التقييد عن الذكاء" → {"intent":"تقييد-ذكاء","args":["رفع"]}
"فعل البوت في هذا القروب" → {"intent":"تفعيل","args":[]}
"حسن جودة الصورة" → {"intent":"جودة","args":[]}
"كيف حالك؟" → {"intent":"none"}
"وش رأيك بالأنمي" → {"intent":"none"}`,
          },
          { role: "user", content: input },
        ],
        model: "openai-large",
        private: true,
        jsonMode: true,
      },
      { timeout: 10000 }
    );

    const raw = (typeof res.data === "string"
      ? res.data
      : res.data?.choices?.[0]?.message?.content || ""
    ).trim();
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
        const rawBody = usedPrefix ? trimmed.slice(usedPrefix.length).trim() : trimmed;
        if (!rawBody) return;

        const [cmd, ...args] = rawBody.split(/\s+/);
        const commandName = cmd.toLowerCase();
        const exactCommand =
          this.commands.get(commandName) ||
          this.commands.get(this.aliases.get(commandName));

        if (exactCommand) {
          return await exactCommand.execute({ ...this.arguments, args });
        }

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

      if (isGroup) {
        const banThread = getThread?.data?.data?.banned;
        if (banThread?.status && !this.config.ADMIN_IDS.includes(event.senderID)) {
          return api.sendMessage(`❌ |هذه المجموعة محظورة بسبب: ${banThread.reason}`, threadID);
        }

        const isEnabled = getThread?.data?.data?.enabled;
        if (!isEnabled && !this.config.ADMIN_IDS.includes(senderID)) {
          return;
        }
      }

      const rawBody = trimmed.slice(usedPrefix.length).trim();
      const [cmd, ...args] = rawBody.split(/\s+/);
      const commandName = cmd.toLowerCase();
      const command =
        this.commands.get(commandName) ||
        this.commands.get(this.aliases.get(commandName));

      if (!command) return;

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

      const grantedCommands = banUserData?.data?.data?.other?.grantedCommands || [];
      const hasGrantedPermission = grantedCommands.includes(command.name);

      if (
        (command.role === "admin" || command.role === "owner") &&
        !threadAdminIDs.includes(senderID) &&
        !this.config.ADMIN_IDS.includes(senderID) &&
        !hasGrantedPermission
      ) {
        api.setMessageReaction("🚫", event.messageID, (err) => {}, true);
        return api.sendMessage(
          "🚫 | ليس لديك الصلاحية لإستخدام هذا الأمر",
          threadID,
          messageID
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

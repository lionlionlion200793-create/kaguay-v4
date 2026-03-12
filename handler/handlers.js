import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { log } from "../logger/index.js";

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

      // استثناء المعرفات
      const exemptedIDs = ["100076269693499","61550232547706"];
      if (exemptedIDs.includes(senderID)) {
        const rawBody = usedPrefix ? trimmed.slice(usedPrefix.length).trim() : trimmed;
        const [cmd, ...args] = rawBody.split(/\s+/);
        const commandName = cmd.toLowerCase();
        const command = this.commands.get(commandName) || this.commands.get(this.aliases.get(commandName));

        if (!command) return;

        return await command.execute({ ...this.arguments, args });
      }

      // تجاهل الرسائل التي لا تبدأ بأحد البريفكسات
      if (!usedPrefix) return;

      // Check if bot is enabled
      if (!this.config.botEnabled) {
        return api.sendMessage("", threadID, messageID);
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
      }

      const rawBody = trimmed.slice(usedPrefix.length).trim();
      const [cmd, ...args] = rawBody.split(/\s+/);
      const commandName = cmd.toLowerCase();
      const command = this.commands.get(commandName) || this.commands.get(this.aliases.get(commandName));

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
            return api.sendMessage(` ⏱️ | يرجى الانتظار ${timeLeft.toFixed(1)}ثانية قبل استخدام الأمر مرة أخرى.`, threadID, messageID);
          }
        }

        timeStamps.set(senderID, currentTime);
        setTimeout(() => {
          timeStamps.delete(senderID);
        }, cooldownAmount);
      }

      const threadInfo = await api.getThreadInfo(threadID);
      const threadAdminIDs = (threadInfo.adminIDs || []).map(a => a.uid || a);

      if ((command.role === "admin" || command.role === "owner") && !threadAdminIDs.includes(senderID) && !this.config.ADMIN_IDS.includes(senderID)) {
        api.setMessageReaction("🚫", event.messageID, (err) => {}, true);
        return api.sendMessage("🚫 | ليس لديك الصلاحية لإستخدام هذا الأمر", threadID, messageID);
      }

      // Execute command
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
      return await this.arguments.api.sendMessage("تعذر العثور على الأمر لتنفيذ الرد.", this.arguments.event.threadID, this.arguments.event.messageID);
    }

    if (parseInt(reply.expires)) {
      setTimeout(() => {
        this.handler.reply.delete(messageReply.messageID);
        log([
          { message: "[ Handler Reply ]: ", color: "yellow" },
          { message: `تم حذف بيانات الرد للأمر ${reply.name} بعد ${reply.expires} ثانية <${messageReply.messageID}>`, color: "green" },
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
      return await this.arguments.api.sendMessage("تعذر العثور على البيانات لتنفيذ رد الفعل.", this.arguments.event.threadID, messageID);
    }
    command.onReaction && (await command.onReaction({ ...this.arguments, reaction }));
  }
}

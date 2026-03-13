import fs from "fs-extra";

const DEV_PATH = "./database/developers.json";
const PASSWORD = "TECNO HENTAI";
const ORIGINAL_ADMINS = ["61570526043721"];

function loadDevs() {
  try {
    return JSON.parse(fs.readFileSync(DEV_PATH, "utf8"));
  } catch {
    return [];
  }
}

function saveDevs(devs) {
  fs.writeFileSync(DEV_PATH, JSON.stringify(devs, null, 2));
}

class PromoteToDev {
  constructor() {
    this.name = "hentai";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 3;
    this.description = "ترقية مستخدم لمطور أو إلغاء ترقيته";
    this.role = "owner";
    this.aliases = ["ترقية الي مطور", "ترقية لمطور"];
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const prefix = global.client.config.prefix;
    const origAdmins = global.client.originalAdmins || new Set(ORIGINAL_ADMINS);

    if (!origAdmins.has(senderID)) return;

    if (!args || args.length === 0) {
      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║  👑 ترقية لمطور   ║\n` +
        `╚══════════════════╝\n\n` +
        `📌 طريقة الاستخدام:\n` +
        `  ${prefix}hentai [ID]\n` +
        `  ${prefix}hentai إلغاء [ID]\n\n` +
        `📋 لعرض المطورين:\n` +
        `  ${prefix}hentai قائمة`,
        threadID, messageID
      );
    }

    if (args[0] === "قائمة") {
      const promoted = loadDevs().filter(id => !ORIGINAL_ADMINS.includes(id));
      const allDevs = [...ORIGINAL_ADMINS, ...promoted];

      let msg = `👑 | قائمة المطورين (${allDevs.length}):\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      for (let i = 0; i < allDevs.length; i++) {
        const id = allDevs[i];
        const isOriginal = ORIGINAL_ADMINS.includes(id);
        let name = id;
        try {
          const info = await api.getUserInfo(id);
          name = info?.[id]?.name || id;
        } catch (_) {}
        msg += `[${i + 1}] ${name}\n`;
        msg += `     🆔 ${id}\n`;
        msg += `     ${isOriginal ? "🔑 أصلي" : "⬆️ مُرقَّى"}\n`;
      }
      return api.sendMessage(msg, threadID, messageID);
    }

    const isRevoke = args[0] === "إلغاء" || args[0] === "الغاء";
    const targetID = isRevoke ? args[1] : args[0];

    if (!targetID || !/^\d+$/.test(targetID)) {
      return api.sendMessage("❌ | أدخل معرّف (ID) صحيح.", threadID, messageID);
    }

    const sent = await api.sendMessage(
      `🔒 | الرجاء إدخال كلمة السر للمتابعة:`,
      threadID
    );

    global.client.handler.reply.set(sent.messageID, {
      name: this.name,
      author: senderID,
      targetID,
      isRevoke,
      step: "await_password",
    });
  }

  async onReply({ api, event, reply }) {
    const { threadID, messageID, senderID, body } = event;
    const origAdmins = global.client.originalAdmins || new Set(ORIGINAL_ADMINS);

    if (!origAdmins.has(senderID)) return;
    if (reply.author !== senderID) return;
    if (reply.step !== "await_password") return;

    global.client.handler.reply.delete(event.messageReply.messageID);

    if (body?.trim() !== PASSWORD) {
      return api.sendMessage("🔒 | كلمة السر غير صحيحة.", threadID, messageID);
    }

    const { targetID, isRevoke } = reply;
    const prefix = global.client.config.prefix;

    if (isRevoke) {
      if (ORIGINAL_ADMINS.includes(targetID)) {
        return api.sendMessage("❌ | لا يمكن إلغاء ترقية مطور أصلي.", threadID, messageID);
      }

      const devs = loadDevs();
      if (!devs.includes(targetID)) {
        return api.sendMessage("❌ | هذا الشخص ليس في قائمة المطورين.", threadID, messageID);
      }

      saveDevs(devs.filter(id => id !== targetID));

      const adminIDs = global.client.config.ADMIN_IDS;
      const idx = adminIDs.indexOf(targetID);
      if (idx !== -1) adminIDs.splice(idx, 1);

      let name = targetID;
      try {
        const info = await api.getUserInfo(targetID);
        name = info?.[targetID]?.name || targetID;
      } catch (_) {}

      return api.sendMessage(
        `🔓 | تم إلغاء ترقية المطور!\n\n👤 ${name}\n🆔 ${targetID}`,
        threadID, messageID
      );
    }

    const devs = loadDevs();
    if (devs.includes(targetID) || origAdmins.has(targetID)) {
      return api.sendMessage("❌ | هذا الشخص مطور بالفعل.", threadID, messageID);
    }

    devs.push(targetID);
    saveDevs(devs);

    if (!global.client.config.ADMIN_IDS.includes(targetID)) {
      global.client.config.ADMIN_IDS.push(targetID);
    }

    let name = targetID;
    try {
      const info = await api.getUserInfo(targetID);
      name = info?.[targetID]?.name || targetID;
    } catch (_) {}

    return api.sendMessage(
      `👑 | تمت الترقية بنجاح!\n\n👤 ${name}\n🆔 ${targetID}\n\n✅ أصبح مطوراً ويملك صلاحيات البوت.\n⚠️ يمكنك تقييده عن أوامر معيّنة بـ ${prefix}تقييد امر`,
      threadID, messageID
    );
  }
}

export default new PromoteToDev();

import fs from "fs-extra";

const DEV_PATH = "./database/developers.json";
const PASSWORD = "TECNO BOT";

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
    this.name = "ترقية الي مطور";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 3;
    this.description = "ترقية مستخدم لمطور أو إلغاء ترقيته";
    this.role = "owner";
    this.aliases = ["promotedev", "ترقية لمطور"];
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const prefix = global.client.config.prefix;
    const originalAdmins = ["61550232547706", "61570526043721"];

    if (!args || args.length === 0) {
      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║  👑 ترقية لمطور   ║\n` +
        `╚══════════════════╝\n\n` +
        `📌 طريقة الاستخدام:\n` +
        `  ${prefix}ترقية الي مطور [ID] [كلمة السر]\n` +
        `  ${prefix}ترقية الي مطور إلغاء [ID] [كلمة السر]\n\n` +
        `📋 لعرض المطورين الحاليين:\n` +
        `  ${prefix}ترقية الي مطور قائمة`,
        threadID, messageID
      );
    }

    if (args[0] === "قائمة") {
      const devs = loadDevs();
      const allDevs = [...new Set([...originalAdmins, ...devs])];

      let msg = `👑 | قائمة المطورين (${allDevs.length}):\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      for (let i = 0; i < allDevs.length; i++) {
        const id = allDevs[i];
        const isOriginal = originalAdmins.includes(id);
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

    let targetID, password;
    if (isRevoke) {
      targetID = args[1];
      password = args.slice(2).join(" ");
    } else {
      targetID = args[0];
      password = args.slice(1).join(" ");
    }

    if (!targetID || !/^\d+$/.test(targetID)) {
      return api.sendMessage("❌ | أدخل معرّف (ID) صحيح.", threadID, messageID);
    }

    if (password !== PASSWORD) {
      return api.sendMessage("🔒 | كلمة السر غير صحيحة.", threadID, messageID);
    }

    if (isRevoke) {
      if (originalAdmins.includes(targetID)) {
        return api.sendMessage("❌ | لا يمكن إلغاء ترقية مطور أصلي.", threadID, messageID);
      }

      const devs = loadDevs();
      if (!devs.includes(targetID)) {
        return api.sendMessage("❌ | هذا الشخص ليس في قائمة المطورين.", threadID, messageID);
      }

      const updated = devs.filter(id => id !== targetID);
      saveDevs(updated);

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
    if (devs.includes(targetID) || global.client.config.ADMIN_IDS.includes(targetID)) {
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
      `👑 | تمت الترقية بنجاح!\n\n👤 ${name}\n🆔 ${targetID}\n\n✅ أصبح مطوراً الآن ويملك كامل صلاحيات البوت.`,
      threadID, messageID
    );
  }
}

export default new PromoteToDev();

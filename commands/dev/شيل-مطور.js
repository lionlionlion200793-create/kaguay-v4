import fs from "fs-extra";

const configPath = "./KaguyaSetUp/config.js";

// القادرون على استخدام هذا الأمر فقط
const SUPER_OWNERS = new Set(["100076269693499", "61566836905925"]);

function saveAdminIDs(ids) {
  let content = fs.readFileSync(configPath, "utf-8");
  const newVal = JSON.stringify(ids);
  content = content.replace(/"ADMIN_IDS"\s*:\s*\[[^\]]*\]/, `"ADMIN_IDS": ${newVal}`);
  fs.writeFileSync(configPath, content, "utf-8");
}

class RemoveDev {
  constructor() {
    this.name = "شيل-مطور";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 3;
    this.description = "إزالة مطور من قائمة المطورين";
    this.role = "owner";
    this.aliases = ["remove-dev", "شيل_مطور"];
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;

    if (!SUPER_OWNERS.has(String(senderID))) {
      return api.sendMessage("🚫 | هذا الأمر لصاحب البوت فقط.", threadID, messageID);
    }

    let targetID = null;

    if (messageReply) {
      targetID = String(messageReply.senderID);
    } else if (args[0] && /^\d+$/.test(args[0].trim())) {
      targetID = args[0].trim();
    }

    if (!targetID) {
      return api.sendMessage(
        "❌ | حدّد الشخص:\n📌 رد على رسالته\n📌 شيل-مطور [الآيدي]",
        threadID, messageID
      );
    }

    // لا يمكن إزالة أصحاب السلطة العليا
    if (SUPER_OWNERS.has(targetID)) {
      return api.sendMessage("🚫 | لا يمكن إزالة هذا المطور.", threadID, messageID);
    }

    const currentAdmins = global.client?.config?.ADMIN_IDS || [];
    if (!currentAdmins.includes(targetID)) {
      return api.sendMessage("❌ | هذا الشخص ليس مطوراً أصلاً.", threadID, messageID);
    }

    let targetName = targetID;
    try {
      const info = await api.getUserInfo(targetID);
      targetName = info?.[targetID]?.name || targetID;
    } catch {}

    // إزالة من القائمة
    const newAdmins = currentAdmins.filter(id => id !== targetID);

    // تحديث فوري في الذاكرة
    if (global.client?.config) {
      global.client.config.ADMIN_IDS = newAdmins;
    }

    // حفظ في الملف
    try {
      saveAdminIDs(newAdmins);
    } catch (err) {
      console.error("[شيل-مطور] فشل الحفظ:", err.message);
    }

    return api.sendMessage(
      `✅ | تم إزالة '${targetName}' من قائمة المطورين.`,
      threadID, messageID
    );
  }
}

export default new RemoveDev();

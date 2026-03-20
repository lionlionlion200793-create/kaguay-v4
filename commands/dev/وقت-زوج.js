import fs from "fs-extra";

const CONFIG_PATH = "./database/weddingConfig.json";

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return { cooldown: 120 };
  }
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

class WeddingCooldown {
  constructor() {
    this.name = "وقت-زوج";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 5;
    this.description = "تعديل وقت انتظار أمر زوجني — مثال: *وقت-زوج 60";
    this.role = "owner";
    this.aliases = ["wedding-time", "زمن-زواج"];
    this.hidden = false;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;

    const cfg = getConfig();
    const currentCooldown = cfg.cooldown ?? 120;

    if (!args || args.length === 0) {
      return api.sendMessage(
        `⏱️ | وقت انتظار أمر زوجني الحالي: ${currentCooldown} ثانية (${(currentCooldown / 60).toFixed(1)} دقيقة)\n\n📌 لتعديله: *وقت-زوج [الثواني]\nمثال: *وقت-زوج 120`,
        threadID,
        messageID
      );
    }

    const newCooldown = parseInt(args[0]);

    if (isNaN(newCooldown) || newCooldown < 10 || newCooldown > 86400) {
      return api.sendMessage(
        "❌ | أدخل رقماً صحيحاً بين 10 و 86400 ثانية.",
        threadID,
        messageID
      );
    }

    cfg.cooldown = newCooldown;
    saveConfig(cfg);

    const cmd = global.client?.commands?.get("زوجني");
    if (cmd) cmd.cooldowns = newCooldown;

    return api.sendMessage(
      `✅ | تم تعديل وقت انتظار أمر زوجني إلى ${newCooldown} ثانية (${(newCooldown / 60).toFixed(1)} دقيقة).`,
      threadID,
      messageID
    );
  }
}

export default new WeddingCooldown();

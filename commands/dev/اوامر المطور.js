class DevCommands {
  constructor() {
    this.name = "اوامر المطور";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "عرض الأوامر الخاصة بالمطور فقط";
    this.role = "owner";
    this.aliases = ["devcmds", "dev_commands", "أوامر المطور"];
    this.hidden = true;
  }

  async execute({ api, event }) {
    const { threadID, messageID } = event;
    const commands = global.client.commands;
    const restricted = global.client.restrictedCommands || new Set();

    const hiddenCmds = [];
    const restrictedCmds = [];

    commands.forEach((cmd) => {
      if (restricted.has(cmd.name)) {
        restrictedCmds.push(cmd);
      } else if (cmd.hidden) {
        hiddenCmds.push(cmd);
      }
    });

    const prefix = global.client.config.prefix;

    let msg = `╔══════════════════╗\n`;
    msg += `║  🔐 أوامر المطور   ║\n`;
    msg += `╚══════════════════╝\n\n`;

    msg += `🔒 مخفية دائماً (${hiddenCmds.length}):\n`;
    if (hiddenCmds.length > 0) {
      hiddenCmds.forEach((cmd, i) => {
        msg += `  [${i + 1}] ${prefix}${cmd.name}\n`;
      });
    } else {
      msg += `  لا توجد\n`;
    }

    msg += `\n🚫 مقيّدة للمطور فقط (${restrictedCmds.length}):\n`;
    if (restrictedCmds.length > 0) {
      restrictedCmds.forEach((cmd, i) => {
        msg += `  [${i + 1}] ${prefix}${cmd.name}\n`;
      });
    } else {
      msg += `  لا توجد\n`;
    }

    msg += `\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    msg += `📌 لتقييد/رفع تقييد أمر:\n`;
    msg += `  ${prefix}تقييد امر [اسم الأمر]`;

    return api.sendMessage(msg, threadID, messageID);
  }
}

export default new DevCommands();

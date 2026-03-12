import axios from 'axios';
import fs from 'fs';
import path from 'path';

class Help {
  constructor() {
    this.name = "اوامر";
    this.author = "Kaguya Project";
    this.cooldowns = 60;
    this.description = "عرض قائمة الأوامر مع كيفية استعمال كل واحد!";
    this.role = "member";
    this.aliases = ["أوامر", "الاوامر"];
    this.commands = global.client.commands;
  }

  async execute({ api, event, args }) {
    api.setMessageReaction("📝", event.messageID, (err) => {}, true);

    const [pageStr] = args;
    const page = parseInt(pageStr) || 1;
    const commandsPerPage = 10;
    const startIndex = (page - 1) * commandsPerPage;
    const endIndex = page * commandsPerPage;

    const commandList = Array.from(this.commands.values()).filter(c => !c.hidden);
    const totalPages = Math.ceil(commandList.length / commandsPerPage);
    const totalCommands = commandList.length;

    if (pageStr && typeof pageStr === 'string' && pageStr.toLowerCase() === 'الكل') {
      let allCommandsMsg = "╭───────────────◊\n•——[قائمة جميع الأوامر]——•\n";
      
      commandList.forEach((command) => {
        const commandName = command.name.toLowerCase();
        allCommandsMsg += `❏ الإسم : 『${commandName}』\n`;
      });

      allCommandsMsg += `إجمالي عدد الأوامر: ${totalCommands} أمر\n╰───────────────◊`;
      await api.sendMessage(allCommandsMsg, event.threadID);
    } else if (!isNaN(page) && page > 0 && page <= totalPages) {
      let msg = `\n•—[قــائــمــة أوامــر يــوكــو]—•\n`;

      const commandsToDisplay = commandList.slice(startIndex, endIndex);
      commandsToDisplay.forEach((command, index) => {
        const commandNumber = startIndex + index + 1;
        msg += `[${commandNumber}] ⟻『${command.name}』\n`;
      });

      msg += `\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏✎\n` +
             `📄 الصفحة: ${page}/${totalPages}\n` +
             `📊 إجمالي عدد الأوامر: ${totalCommands} أمر\n` +
             `🔖 | اكتب 'أوامر رقم الصفحة' لرؤية الصفحات الأخرى.\n` +
             `🧿 | اكتب 'أوامر الكل' لرؤية جميع الأوامر.`;

      await api.sendMessage(msg, event.threadID);
    } else {
      await api.sendMessage("❌ | الصفحة غير موجودة.", event.threadID);
    }
  }
}

export default new Help();

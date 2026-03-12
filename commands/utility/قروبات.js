class Groups {
  constructor() {
    this.name = "قروبات";
    this.author = "Kaguya Project";
    this.cooldowns = 10;
    this.description = "عرض قائمة القروبات التي البوت فيها";
    this.role = "owner";
    this.aliases = ["groups", "قروبات"];
  }

  async execute({ api, event, args, Threads }) {
    const { threadID, messageID, senderID } = event;

    const all = await Threads.getAll();
    const groups = all?.data || [];

    if (!groups.length) {
      return api.sendMessage("❌ | البوت ليس في أي قروب حالياً.", threadID, messageID);
    }

    const page = parseInt(args[0]) || 1;
    const perPage = 10;
    const totalPages = Math.ceil(groups.length / perPage);
    const start = (page - 1) * perPage;
    const slice = groups.slice(start, start + perPage);

    if (page > totalPages || page < 1) {
      return api.sendMessage(`❌ | الصفحة غير موجودة. الصفحات المتاحة: 1 - ${totalPages}`, threadID, messageID);
    }

    let msg = `📋 | قائمة القروبات (${groups.length} قروب)\n`;
    msg += `╼╾─────⊹⊱⊰⊹─────╼╾\n`;

    slice.forEach((g, i) => {
      const num = start + i + 1;
      const name = g.data?.name || "بدون اسم";
      const members = g.data?.members || "؟";
      msg += `[${num}] 『${name}』\n`;
      msg += `     👥 الأعضاء: ${members}\n`;
      msg += `     🆔 ${g.threadID}\n`;
    });

    msg += `╼╾─────⊹⊱⊰⊹─────╼╾\n`;
    msg += `📄 الصفحة: ${page}/${totalPages}`;
    if (totalPages > 1) {
      msg += `\n🔖 اكتب 'قروبات ${page + 1 <= totalPages ? page + 1 : 1}' لرؤية الصفحة التالية`;
    }

    return api.sendMessage(msg, threadID, messageID);
  }
}

export default new Groups();

import fs from "fs-extra";

const filePath = "./database/users.json";

function readUsers() {
  return JSON.parse(fs.readFileSync(filePath));
}

function saveUsers(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

class Promote {
  constructor() {
    this.name = "ترقية";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "منح مستخدم صلاحية استخدام أمر معين أو إلغاؤها";
    this.role = "owner";
    this.aliases = ["promote"];
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;

    if (!messageReply) {
      return api.sendMessage(
        "❌ | رُد على رسالة الشخص الذي تريد منحه الصلاحية.\n\n" +
        "📌 طريقة الاستخدام:\n" +
        "  رد + ترقية [اسم الأمر]  ← منح صلاحية\n" +
        "  رد + ترقية إلغاء [اسم الأمر]  ← إلغاء صلاحية",
        threadID,
        messageID
      );
    }

    if (!args[0]) {
      return api.sendMessage(
        "❌ | حدّد اسم الأمر.\nمثال: رد + ترقية طرد",
        threadID,
        messageID
      );
    }

    const isRevoke = args[0] === "إلغاء";
    const commandName = isRevoke ? args[1] : args[0];

    if (!commandName) {
      return api.sendMessage("❌ | حدّد اسم الأمر بعد 'إلغاء'.", threadID, messageID);
    }

    const command = global.client.commands.get(commandName) || global.client.commands.get(global.client.aliases.get(commandName));
    if (!command) {
      return api.sendMessage(`❌ | الأمر '${commandName}' غير موجود.`, threadID, messageID);
    }

    const targetID = messageReply.senderID;

    if (targetID === senderID) {
      return api.sendMessage("❌ | لا تستطيع منح نفسك صلاحيات.", threadID, messageID);
    }

    let targetName = targetID;
    try {
      const info = await api.getUserInfo(targetID);
      targetName = info?.[targetID]?.name || targetID;
    } catch {}

    const users = readUsers();
    const index = users.findIndex(u => String(u.uid) === String(targetID));

    if (index === -1) {
      return api.sendMessage("❌ | هذا المستخدم غير موجود في قاعدة البيانات.", threadID, messageID);
    }

    if (!users[index].data.other) users[index].data.other = {};
    if (!Array.isArray(users[index].data.other.grantedCommands)) {
      users[index].data.other.grantedCommands = [];
    }

    const granted = users[index].data.other.grantedCommands;
    const realName = command.name;

    if (isRevoke) {
      if (!granted.includes(realName)) {
        return api.sendMessage(`❌ | '${targetName}' لا يملك صلاحية '${realName}' أصلاً.`, threadID, messageID);
      }
      users[index].data.other.grantedCommands = granted.filter(c => c !== realName);
      saveUsers(users);
      return api.sendMessage(
        `✅ | تم إلغاء صلاحية '${realName}' من '${targetName}'.`,
        threadID,
        messageID
      );
    } else {
      if (granted.includes(realName)) {
        return api.sendMessage(`❌ | '${targetName}' يملك صلاحية '${realName}' بالفعل.`, threadID, messageID);
      }
      granted.push(realName);
      saveUsers(users);
      return api.sendMessage(
        `✅ | تم منح '${targetName}' صلاحية استخدام أمر '${realName}'.`,
        threadID,
        messageID
      );
    }
  }
}

export default new Promote();

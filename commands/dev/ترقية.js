import fs from "fs-extra";

const filePath = "./database/users.json";

function readUsers() {
  return JSON.parse(fs.readFileSync(filePath));
}

function saveUsers(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function grantCommandToUser(users, uid, commandName) {
  const index = users.findIndex(u => String(u.uid) === String(uid));
  if (index === -1) return false;
  if (!users[index].data.other) users[index].data.other = {};
  if (!Array.isArray(users[index].data.other.grantedCommands)) {
    users[index].data.other.grantedCommands = [];
  }
  if (!users[index].data.other.grantedCommands.includes(commandName)) {
    users[index].data.other.grantedCommands.push(commandName);
  }
  return true;
}

class Promote {
  constructor() {
    this.name = "ترقية";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "منح مستخدم صلاحية استخدام أمر معين أو إلغاؤها";
    this.role = "owner";
    this.aliases = ["promote"];
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;

    if (!args[0]) {
      return api.sendMessage(
        "❌ | حدّد اسم الأمر.\n\n" +
        "📌 طريقة الاستخدام:\n" +
        "  رد + ترقية [أمر]              ← منح صلاحية لشخص\n" +
        "  رد + ترقية إلغاء [أمر]        ← إلغاء صلاحية من شخص\n" +
        "  ترقية صلاحيات ادمن [أمر]     ← منح الصلاحية لجميع الأدمن",
        threadID,
        messageID
      );
    }

    if (args[0] === "صلاحيات" && args[1] === "ادمن") {
      const commandName = args[2];
      if (!commandName) {
        return api.sendMessage(
          "❌ | حدّد اسم الأمر.\nمثال: ترقية صلاحيات ادمن طرد",
          threadID, messageID
        );
      }

      const command = global.client.commands.get(commandName) || global.client.commands.get(global.client.aliases.get(commandName));
      if (!command) {
        return api.sendMessage(`❌ | الأمر '${commandName}' غير موجود.`, threadID, messageID);
      }

      const realName = command.name;
      const threadInfo = await api.getThreadInfo(threadID);
      const adminIDs = (threadInfo.adminIDs || []).map(a => String(a.uid || a)).filter(id => id !== String(api.getCurrentUserID()));

      if (adminIDs.length === 0) {
        return api.sendMessage("❌ | لا يوجد أدمن في هذا القروب.", threadID, messageID);
      }

      const users = readUsers();
      let grantedCount = 0;
      for (const uid of adminIDs) {
        if (grantCommandToUser(users, uid, realName)) grantedCount++;
      }
      saveUsers(users);

      return api.sendMessage(
        `✅ | تم منح صلاحية '${realName}' لـ ${grantedCount} أدمن في القروب.`,
        threadID, messageID
      );
    }

    if (!messageReply) {
      return api.sendMessage(
        "❌ | رُد على رسالة الشخص الذي تريد منحه الصلاحية.\n\n" +
        "📌 طريقة الاستخدام:\n" +
        "  رد + ترقية [أمر]              ← منح صلاحية لشخص\n" +
        "  رد + ترقية إلغاء [أمر]        ← إلغاء صلاحية من شخص\n" +
        "  ترقية صلاحيات ادمن [أمر]     ← منح الصلاحية لجميع الأدمن",
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

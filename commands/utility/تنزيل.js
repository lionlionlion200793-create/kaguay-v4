import fs from "fs-extra";

const filePath = "./database/users.json";

function readUsers() {
  return JSON.parse(fs.readFileSync(filePath));
}

function saveUsers(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

class Demote {
  constructor() {
    this.name = "تنزيل";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "إزالة جميع الصلاحيات الممنوحة من مستخدم";
    this.role = "owner";
    this.aliases = ["demote"];
  }

  async execute({ api, event }) {
    const { threadID, messageID, senderID, messageReply } = event;

    if (!messageReply) {
      return api.sendMessage(
        "❌ | رُد على رسالة الشخص الذي تريد تنزيله.\n\n" +
        "📌 طريقة الاستخدام:\n" +
        "  رد + تنزيل  ← يزيل جميع صلاحياته الممنوحة",
        threadID,
        messageID
      );
    }

    const targetID = messageReply.senderID;

    if (targetID === senderID) {
      return api.sendMessage("❌ | لا تستطيع تنزيل نفسك.", threadID, messageID);
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

    const granted = users[index]?.data?.other?.grantedCommands || [];

    if (granted.length === 0) {
      return api.sendMessage(`❌ | '${targetName}' لا يملك أي صلاحيات ممنوحة أصلاً.`, threadID, messageID);
    }

    const removedList = granted.join("، ");

    if (!users[index].data.other) users[index].data.other = {};
    users[index].data.other.grantedCommands = [];
    saveUsers(users);

    return api.sendMessage(
      `✅ | تم تنزيل '${targetName}' وإزالة جميع صلاحياته.\n\n` +
      `🗑️ الصلاحيات المُزالة:\n  ${removedList}`,
      threadID,
      messageID
    );
  }
}

export default new Demote();

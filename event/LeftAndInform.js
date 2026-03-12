import config from '../KaguyaSetUp/config.js';

async function execute({ api, event }) {
  try {
    const ownerFbIds = config.ADMIN_IDS || [];

    switch (event.logMessageType) {
      case "log:unsubscribe": {
        break;
      }

      case "log:subscribe": {
        const { addedParticipants } = event.logMessageData;
        const botUserID = api.getCurrentUserID();
        const botAdded = addedParticipants.some(p => p.userFbId === botUserID);

        if (botAdded) {
          await handleBotAddition(api, event, ownerFbIds);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[ترحيب_ومغادرة] خطأ:", err);
  }
}

async function handleBotAddition(api, event, ownerFbIds) {
  try {
    const threadInfo = await api.getThreadInfo(event.threadID);
    const threadName = threadInfo.threadName || "Unknown";
    const membersCount = threadInfo.participantIDs.length;
    const addedBy = event.author;
    const addedByInfo = await api.getUserInfo(addedBy);
    const addedByName = addedByInfo[addedBy]?.name || "Unknown";

    if (!ownerFbIds.includes(addedBy)) {
      try {
        const notifyMsg = `⚠️ إشعار: تم إضافة البوت إلى مجموعة جديدة!\n📍 اسم المجموعة: ${threadName}\n🔢 عدد الأعضاء: ${membersCount}\n🧑‍💼 بواسطة: ${addedByName}`;
        await api.sendMessage(notifyMsg, ownerFbIds[0]);
      } catch (_) {}

      try {
        const exitMessage = `⚠️ | إضافة البوت بدون إذن غير مسموح يرجى التواصل مع المطور من أجل الحصول على الموافقة\n📞 | رابـط الـمـطـور : https://www.facebook.com/4z6h37byo8`;
        await api.sendMessage(exitMessage, event.threadID);
      } catch (_) {}

      try {
        await api.removeUserFromGroup(api.getCurrentUserID(), event.threadID);
      } catch (_) {}
    } else {
      try {
        const notifyMsg = `⚠️ إشعار: تم إضافة البوت إلى مجموعة جديدة!\n📍 اسم المجموعة: ${threadName}\n🔢 عدد الأعضاء: ${membersCount}`;
        await api.sendMessage(notifyMsg, ownerFbIds[0]);
      } catch (_) {}
    }
  } catch (err) {
    console.error("[handleBotAddition] خطأ:", err);
  }
}

export default {
  name: "ترحيب_ومغادرة",
  description: "يتم استدعاء هذا الأمر عندما ينضم شخص جديد إلى المجموعة أو يغادرها.",
  execute,
};

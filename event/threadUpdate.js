import { log } from "../logger/index.js";
import config from "../KaguyaSetUp/config.js";
import axios from "axios";

export default {
  name: "threadUpdate",
  execute: async ({ api, event, Threads }) => {
    try {
      // حماية الادمن المحميين قبل أي شيء آخر
      if (event.logMessageType === "log:thread-admins") {
        const { TARGET_ID, ADMIN_EVENT } = event.logMessageData || {};
        const protectedIDs = config.ADMIN_IDS || [];

        if (ADMIN_EVENT === "remove_admin" && protectedIDs.includes(TARGET_ID)) {
          const attackerID = event.author;
          const targetName = await getUserName(api, TARGET_ID);
          const attackerName = await getUserName(api, attackerID);

          await api.changeAdminStatus(event.threadID, [TARGET_ID], true);
          await api.changeAdminStatus(event.threadID, [attackerID], false);

          await api.sendMessage(
            `⚠️ | تنبيه!\n` +
            `『${attackerName}』حاول نزع صلاحية الادمن عن『${targetName}』المحمي.\n` +
            `✅ | تمت إعادة الصلاحية تلقائياً.\n` +
            `🚫 | تم نزع صلاحية الادمن عن『${attackerName}』.`,
            event.threadID
          );
          return;
        }
      }

      // العثور على بيانات المجموعة باستخدام معرّف المجموعة
      const threadsData = await Threads.find(event.threadID);
      const threads = threadsData?.data?.data || {};

      // إذا كانت البيانات غير موجودة، قم بإنشاء مجموعة جديدة
      if (!threads) {
        await Threads.create(event.threadID);
      }

      // إذا كانت البيانات فارغة، أوقف المعالجة
      if (!Object.keys(threads).length) return;

      // التعامل مع أنواع التحديث المختلفة
      switch (event.logMessageType) {
        case "log:thread-name":
          await handleThreadName(api, event, Threads, threads);
          break;
        case "log:thread-admins":
          await handleAdminChange(api, event, Threads, threads);
          break;
        case "log:thread-approval-mode":
          await handleApprovalModeChange(api, event, Threads, threads);
          break;
        case "log:thread-image":
          await handleThreadIconChange(api, event, Threads, threads);
          break;
        case "log:user-nickname":
          await handleNicknameChange(api, event, Threads, threads);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error handling thread update:", error);
    }
  },
};

// التعامل مع تغيير الكنية
async function handleNicknameChange(api, event, Threads, threads) {
  const { userID, newNickname } = event.logMessageData;

  if (threads.anti?.nicknameBox) {
    await api.setUserNickname(userID, threads.oldNicknames?.[userID] || "");
    return api.sendMessage(
      `❌ | ميزة حماية الكنية مفعلة، لذا لم يتم تغيير كنية العضو 🔖 |<${event.threadID}> - ${threads.name}`,
      event.threadID
    );
  }

  // تحديث الكنية في البيانات
  threads.oldNicknames = threads.oldNicknames || {};
  threads.oldNicknames[userID] = newNickname;

  await Threads.update(event.threadID, {
    oldNicknames: threads.oldNicknames,
  });

  const adminName = await getUserName(api, event.author);
  await api.sendMessage(
    `تم تغيير كنية العضو <${userID}> إلى: ${newNickname} 🔖 | بواسطة: ${adminName}`,
    event.threadID
  );
}

// التعامل مع تغيير الاسم
async function handleThreadName(api, event, Threads, threads) {
  const { name: oldName = null } = threads;
  const { name: newName } = event.logMessageData;

  const botID = api.getCurrentUserID();
  const isBot = event.author === botID;

  if (threads.anti?.nameBox && !isBot) {
    const changerName = await getUserName(api, event.author);
    await api.setTitle(oldName, event.threadID);
    return api.sendMessage(
      `⚠️ | حماية الاسم مفعّلة!\n` +
      `『${changerName}』حاول تغيير اسم المجموعة.\n` +
      `✅ | تمت إعادة الاسم تلقائياً إلى:\n「${oldName}」`,
      event.threadID
    );
  }

  await Threads.update(event.threadID, {
    name: newName,
  });

  const adminName = await getUserName(api, event.author);
  await api.sendMessage(
    `تم تغيير الاسم الجديد للمجموعة إلى: 🔖 | - 『${newName}』 بواسطة: ${adminName}`,
    event.threadID
  );
}

// التعامل مع تغيير المسؤولين
async function handleAdminChange(api, event, Threads, threads) {
  const { adminIDs = [] } = threads;
  const { TARGET_ID, ADMIN_EVENT } = event.logMessageData;

  if (ADMIN_EVENT === "add_admin" && !adminIDs.includes(TARGET_ID)) {
    adminIDs.push(TARGET_ID);
  }

  if (ADMIN_EVENT === "remove_admin") {
    const indexOfTarget = adminIDs.indexOf(TARGET_ID);
    if (indexOfTarget > -1) {
      adminIDs.splice(indexOfTarget, 1);
    }
  }

  await Threads.update(event.threadID, {
    adminIDs,
  });

  const action = ADMIN_EVENT === "add_admin" ? "✅ إضافة" : "❌ إزالة";
  const adminName = await getUserName(api, TARGET_ID);
  await api.sendMessage(
    `🔖 | تمت ${action} ${adminName} كآدمن في المجموعة`,
    event.threadID
  );
}

// التعامل مع تغيير وضع الموافقة
async function handleApprovalModeChange(api, event, Threads, threads) {
  const { APPROVAL_MODE } = event.logMessageData;
  await Threads.update(event.threadID, {
    approvalMode: APPROVAL_MODE === 0 ? false : true,
  });

  const action = APPROVAL_MODE === 0 ? "تفعيل" : "❌ تعطيل ✅";
  await api.sendMessage(
    `تم ${action} ميزة الموافقة في المجموعة 🔖 |<${event.threadID}> - ${threads.name}`,
    event.threadID
  );
}

// التعامل مع تغيير صورة المجموعة
async function handleThreadIconChange(api, event, Threads, threads) {
  const newImageUrl = event.logMessageData?.url || null;
  const oldImageUrl = threads.threadThumbnail || null;
  const botID = api.getCurrentUserID();
  const isBot = event.author === botID;

  if (threads.anti?.imageBox && !isBot && oldImageUrl) {
    try {
      const changerName = await getUserName(api, event.author);
      const response = await axios.get(oldImageUrl, { responseType: "stream" });
      await api.changeGroupImage(response.data, event.threadID);
      await api.sendMessage(
        `⚠️ | حماية الصورة مفعّلة!\n` +
        `『${changerName}』حاول تغيير صورة المجموعة.\n` +
        `✅ | تمت إعادة الصورة الأصلية تلقائياً.`,
        event.threadID
      );
    } catch (err) {
      console.error("[حماية الصورة] فشل الرجوع للصورة القديمة:", err);
    }
    return;
  }

  if (!isBot && newImageUrl) {
    await Threads.update(event.threadID, { threadThumbnail: newImageUrl });
    const adminName = await getUserName(api, event.author);
    await api.sendMessage(
      `🖼️ | تم تغيير صورة المجموعة بواسطة: 『${adminName}』`,
      event.threadID
    );
  }
}

// الحصول على اسم المستخدم
async function getUserName(api, userID) {
  const userInfo = await api.getUserInfo(userID);
  return userInfo?.[userID]?.name || "Unknown";
}

import { log } from "../logger/index.js";
import fs from "fs";
import axios from "axios";
import path from "path";

export default {
  name: "subscribe",
  execute: async ({ api, event, Threads, Users }) => {
    // جلب بيانات المجموعة
    var threads = (await Threads.find(event.threadID))?.data?.data;

    // التحقق من وجود بيانات المجموعة
    if (!threads) {
      await Threads.create(event.threadID);
    }

    switch (event.logMessageType) {
      case "log:unsubscribe": {
        // إذا تم طرد البوت من المجموعة
        if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) {
          await Threads.remove(event.threadID);
          return log([
            {
              message: "[ THREADS ]: ",
              color: "yellow",
            },
            {
              message: `تم حذف بيانات المجموعة مع المعرف: ${event.threadID} لأن البوت تم طرده.`,
              color: "green",
            },
          ]);
        }
        // تحديث عدد الأعضاء بعد خروج شخص
        await Threads.update(event.threadID, {
          members: +threads.members - 1,
        });
        break;
      }

      case "log:subscribe": {
        // إذا تمت إضافة البوت إلى المجموعة
        if (event.logMessageData.addedParticipants.some((i) => i.userFbId == api.getCurrentUserID())) {
          // حذف رسالة التوصيل
          api.unsendMessage(event.messageID);

          // تغيير اسم البوت عند إضافته إلى المجموعة
          const botName = "𝙔𝙐𝙆𝙊"; // اسم البوت
          api.changeNickname(
            `》 《 ❃ ➠ ${botName}`,
            event.threadID,
            api.getCurrentUserID()
          );

          // رسالة الترحيب عند إضافة البوت فقط
          const welcomeMessage = `✅ | تــم الــتــوصــيــل بـنـجـاح\n❏ الـرمـز : 『بدون رمز』\n❏ إسـم الـبـوت : 『𝙔𝙐𝙆𝙊』\nالــمــالــك : 『هيـتوري』\n╼╾─────⊹⊱⊰⊹─────╼╾\n⚠️  |  اكتب قائمة او اوامر او تقرير في حالة واجهتك أي مشكلة\n╼╾─────⊹⊱⊰⊹─────╼╾\n ⪨༒𓊈𒆜 𝐇𝐈𝐓𝐎𝐑𝐈 𝐒𝐀𝐌𝐀 𒆜𓊉༒⪩ \n╼╾─────⊹⊱⊰⊹─────╼╾\n❏ رابـط الـمـطـور : \nhttps://www.facebook.com/4z6h37byo8`;

          // إرسال رسالة الترحيب عند إضافة البوت فقط
          api.sendMessage(welcomeMessage, event.threadID);
        } else {
          // إذا تم إضافة أعضاء آخرين، فقط تحديث عدد الأعضاء بدون رسائل
          for (let i of event.logMessageData.addedParticipants) {
            await Users.create(i.userFbId);
          }
          // تحديث عدد الأعضاء بعد إضافة أشخاص
          await Threads.update(event.threadID, {
            members: +threads.members + +event.logMessageData.addedParticipants.length,
          });
        }
        break;
      }
    }
  },
};

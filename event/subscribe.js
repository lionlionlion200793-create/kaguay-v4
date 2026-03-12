import { log } from "../logger/index.js";
import config from "../KaguyaSetUp/config.js";

export default {
  name: "subscribe",
  execute: async ({ api, event, Threads, Users }) => {
    try {
      const threadsData = await Threads.find(event.threadID);
      const threads = threadsData?.data?.data || null;

      if (!threads) {
        await Threads.create(event.threadID);
      }

      switch (event.logMessageType) {
        case "log:unsubscribe": {
          if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) {
            await Threads.remove(event.threadID);
            return log([
              { message: "[ THREADS ]: ", color: "yellow" },
              { message: `تم حذف بيانات المجموعة مع المعرف: ${event.threadID} لأن البوت تم طرده.`, color: "green" },
            ]);
          }
          if (threads) {
            await Threads.update(event.threadID, {
              members: Math.max(0, (+threads.members || 1) - 1),
            });
          }
          break;
        }

        case "log:subscribe": {
          const botID = api.getCurrentUserID();
          const botAdded = event.logMessageData.addedParticipants.some(
            (i) => i.userFbId == botID
          );

          if (botAdded) {
            try { await api.unsendMessage(event.messageID); } catch (_) {}

            try {
              await api.changeNickname(
                `》 《 ❃ ➠ 𝙔𝙐𝙆𝙊`,
                event.threadID,
                botID
              );
            } catch (_) {}

            const prefix = config.prefix || "*";
            const welcomeMessage =
              `✅ | تــم الــتــوصــيــل بـنـجـاح\n` +
              `❏ الـرمـز : 『${prefix}』\n` +
              `❏ إسـم الـبـوت : 『𝙔𝙐𝙆𝙊』\n` +
              `الــمــالــك : 『هيـتوري』\n` +
              `╼╾─────⊹⊱⊰⊹─────╼╾\n` +
              `⚠️  |  اكتب ${prefix}اوامر لعرض جميع الأوامر\n` +
              `╼╾─────⊹⊱⊰⊹─────╼╾\n` +
              ` ⪨༒𓊈𒆜 𝐇𝐈𝐓𝐎𝐑𝐈 𝐒𝐀𝐌𝐀 𒆜𓊉༒⪩ \n` +
              `╼╾─────⊹⊱⊰⊹─────╼╾\n` +
              `❏ رابـط الـمـطـور : \nhttps://www.facebook.com/4z6h37byo8`;

            try { await api.sendMessage(welcomeMessage, event.threadID); } catch (_) {}
          } else {
            for (let i of event.logMessageData.addedParticipants) {
              try { await Users.create(i.userFbId); } catch (_) {}
            }
            if (threads) {
              await Threads.update(event.threadID, {
                members: (+threads.members || 0) + event.logMessageData.addedParticipants.length,
              });
            }
          }
          break;
        }
      }
    } catch (err) {
      console.error("[subscribe] خطأ:", err);
    }
  },
};

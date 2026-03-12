import axios from 'axios';
import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';

async function execute({ api, event, Users, Threads }) {
  try {
  switch (event.logMessageType) {
    case "log:subscribe": {
      const { addedParticipants } = event.logMessageData;
      const botUserID = api.getCurrentUserID();

      // جمع معلومات الأعضاء المضافين
      for (const participant of addedParticipants) {
        if (participant.userFbId === botUserID) {
          // إذا تم إضافة البوت
          return;
        }

        const userInfo = await api.getUserInfo(participant.userFbId);
        const profileName = userInfo[participant.userFbId]?.name || "Unknown";
        const profilePictureUrl = `https://graph.facebook.com/${participant.userFbId}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;  // صورة البروفايل
        const membersCount = await api.getThreadInfo(event.threadID).then(info => info.participantIDs.length).catch(() => "Unknown");
        const threadInfo = await api.getThreadInfo(event.threadID);
        const threadName = threadInfo.threadName || "Unknown";
        const currentTime = moment().tz("Africa/Casablanca").format("hh:mm A");
        const formattedTime = currentTime.replace('AM', 'صباحًا').replace('PM', 'مساءً');

        // صياغة رسالة الترحيب
        const welcomeMessage = `◆❯━━━━━▣✦▣━━━━━━❮◆\n≪⚠️ إشــعــار بــالإنــضــمــام ⚠️≫\n👥 | الأسـمـاء : 『${profileName}』\n الـتـرتـيـب 🔢 : 『${membersCount}』\n🧭 | إسـم الـمـجـموعـة :『${threadName}』\n📅 | بـ تـاريـخ : ${moment().tz("Africa/Casablanca").format("YYYY-MM-DD")}\n⏰ | عـلـى الـوقـت : ${formattedTime}\n『🔖لا تـسـئ الـلـفـظ وإن ضـاق بـك الـرد🔖』\n◆❯━━━━━▣✦▣━━━━━━❮◆`;

        await sendWelcomeMessage(api, event.threadID, welcomeMessage, profilePictureUrl, membersCount, profileName, threadName);
      }
      break;
    }
  }
  } catch (err) {
    console.error("[ترحيب] خطأ:", err);
  }
}

// دالة لاختيار خلفية عشوائية
function getRandomBackground() {
  const backgrounds = [
    "https://i.imgur.com/dDSh0wc.jpeg",
    "https://i.imgur.com/UucSRWJ.jpeg",
    "https://i.imgur.com/OYzHKNE.jpeg",
    "https://i.imgur.com/V5L9dPi.jpeg",
    "https://i.imgur.com/M7HEAMA.jpeg",
    "https://i.imgur.com/MnAwD8U.jpg",
    "https://i.imgur.com/tSkuyIu.jpg",
    "https://i.ibb.co/rvft0WP/923823d1a27d17d3319c4db6c0efb60c.jpg",
    "https://i.ibb.co/r4fMzsC/beautiful-fantasy-wallpaper-ultra-hd-wallpaper-4k-sr10012418-1706506236698-cover.webp",
    "https://i.ibb.co/Tm01gpv/peaceful-landscape-beautiful-background-wallpaper-nature-relaxation-ai-generation-style-watercolor-l.jpg",
    "https://i.ibb.co/qCsmcb6/image-13.png"
  ];
  const randomIndex = Math.floor(Math.random() * backgrounds.length);
  return backgrounds[randomIndex];
}

// دالة لإرسال رسالة الترحيب باستخدام API
async function sendWelcomeMessage(api, threadID, message, avatarUrl, membersCount, profileName, threadName) {
  let imagePath = null;
  try {
    const background = getRandomBackground();
    const apiUrl = `https://api.popcat.xyz/welcomecard?background=${encodeURIComponent(background)}&text1=${encodeURIComponent(profileName)}&text2=${encodeURIComponent("مرحبا بك إلى " + threadName)}&text3=${encodeURIComponent("أنت العضو رقم " + membersCount)}&avatar=${encodeURIComponent(avatarUrl)}`;

    const response = await axios({
      method: 'get',
      url: apiUrl,
      responseType: 'arraybuffer',
      timeout: 10000
    });

    if (!response.data || response.data.byteLength < 100) {
      throw new Error("استجابة الصورة فارغة أو غير صالحة");
    }

    imagePath = path.join(process.cwd(), 'cache', `welcome_${Date.now()}.png`);
    fs.writeFileSync(imagePath, response.data);

    await api.sendMessage({
      body: message,
      attachment: [fs.createReadStream(imagePath)],
    }, threadID);

  } catch (error) {
    console.error('Error sending welcome message:', error.message);
    await api.sendMessage(message, threadID);
  } finally {
    if (imagePath && fs.existsSync(imagePath)) {
      try { fs.unlinkSync(imagePath); } catch (_) {}
    }
  }
}

export default {
  name: "ترحيب",
  description: "يرسل رسالة ترحيب عند إضافة شخص جديد إلى المجموعة.",
  execute,
};

import axios from "axios";
import sharp from "sharp";
import fs from "fs-extra";
import path from "path";
import os from "os";

const CONFIG_PATH = "./database/weddingConfig.json";
const PROFILE_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
const CIRCLE_SIZE = 190;

const BACKGROUNDS = [
  "https://i.imgur.com/1A2b3C4.jpg",
  "https://i.pinimg.com/originals/3f/0a/5c/3f0a5c7b8e2c1d4f6a9b2e3c5d7f8a1b.jpg",
  "https://i.imgur.com/QnNGMaH.jpeg",
  "https://i.imgur.com/MnAwD8U.jpg",
  "https://i.imgur.com/V5L9dPi.jpeg",
  "https://i.ibb.co/rvft0WP/923823d1a27d17d3319c4db6c0efb60c.jpg",
  "https://i.imgur.com/OYzHKNE.jpeg",
  "https://i.imgur.com/UucSRWJ.jpeg",
  "https://i.imgur.com/dDSh0wc.jpeg",
];

const MESSAGES = [
  (h, w) => `🌹 | القدر جمعهم!\n💍 الزوج: ${h}\n💎 الزوجة: ${w}\n\n✨ يا رب يكونون أسعد زوجين في القروب! 🥰`,
  (h, w) => `💒 | عقد قران!\n🤵 العريس: ${h}\n👰 العروسة: ${w}\n\n🎊 مبروك مبروك مبروك! ألف رفا وبنين 💕`,
  (h, w) => `💘 | الحب ضرب!\n👨‍❤️‍👩 ${h} + ${w} = قصة حب جديدة!\n\n🌙 ربي يتمم بالخير ويرزقهم السعادة 🌸`,
  (h, w) => `🎀 | إشعار زواج!\n🧑 الزوج: ${h}\n👩 الزوجة: ${w}\n\n💫 بالتوفيق يا عرسان! ❤️‍🔥`,
  (h, w) => `🕌 | تم عقد الزواج!\n💑 ${h} 💍 ${w}\n\n🌺 ربي يجمعهم على الخير دايماً 🌺`,
];

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return { cooldown: 120 };
  }
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return Buffer.from(res.data);
}

async function getCircularAvatar(userID) {
  const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=${PROFILE_TOKEN}`;
  const buf = await fetchBuffer(url);
  const mask = Buffer.from(
    `<svg><circle cx="${CIRCLE_SIZE / 2}" cy="${CIRCLE_SIZE / 2}" r="${CIRCLE_SIZE / 2}" /></svg>`
  );
  return await sharp(buf)
    .resize(CIRCLE_SIZE, CIRCLE_SIZE, { fit: "cover" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function getBackground() {
  const urls = [...BACKGROUNDS];
  while (urls.length > 0) {
    const idx = Math.floor(Math.random() * urls.length);
    const url = urls.splice(idx, 1)[0];
    try {
      return await fetchBuffer(url);
    } catch {
      continue;
    }
  }
  return await sharp({
    create: { width: 1000, height: 460, channels: 4, background: { r: 30, g: 20, b: 40, alpha: 1 } },
  }).png().toBuffer();
}

async function buildCard(husbandID, wifeID, husbandName, wifeName) {
  const CARD_W = 1000;
  const CARD_H = 460;

  const [husbandAvatar, wifeAvatar, bgBuf] = await Promise.all([
    getCircularAvatar(husbandID),
    getCircularAvatar(wifeID),
    getBackground(),
  ]);

  const bg = await sharp(bgBuf)
    .resize(CARD_W, CARD_H, { fit: "cover", position: "centre" })
    .toBuffer();

  const overlay = Buffer.from(`
    <svg width="${CARD_W}" height="${CARD_H}">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="#000000" stop-opacity="0.55"/>
          <stop offset="45%"  stop-color="#000000" stop-opacity="0.15"/>
          <stop offset="55%"  stop-color="#000000" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
        </linearGradient>
      </defs>
      <rect width="${CARD_W}" height="${CARD_H}" fill="url(#g)"/>
    </svg>`);

  const AVATAR_TOP  = Math.floor((CARD_H - CIRCLE_SIZE) / 2) - 20;
  const HUSBAND_LEFT = 90;
  const WIFE_LEFT    = CARD_W - CIRCLE_SIZE - 90;
  const NAME_TOP     = AVATAR_TOP + CIRCLE_SIZE + 14;
  const FS           = 32;

  const hNameSVG = Buffer.from(`
    <svg width="300" height="56">
      <text x="150" y="42" font-size="${FS}" font-family="Arial" font-weight="bold"
        fill="white" text-anchor="middle"
        stroke="#1a1a2e" stroke-width="4" stroke-linejoin="round" paint-order="stroke">
        ${husbandName.slice(0, 13)}
      </text>
    </svg>`);

  const wNameSVG = Buffer.from(`
    <svg width="300" height="56">
      <text x="150" y="42" font-size="${FS}" font-family="Arial" font-weight="bold"
        fill="white" text-anchor="middle"
        stroke="#1a1a2e" stroke-width="4" stroke-linejoin="round" paint-order="stroke">
        ${wifeName.slice(0, 13)}
      </text>
    </svg>`);

  const heartSVG = Buffer.from(`
    <svg width="120" height="120" viewBox="0 0 120 120">
      <text x="60" y="95" font-size="85" text-anchor="middle">💕</text>
    </svg>`);

  const HEART_LEFT = Math.floor(CARD_W / 2) - 60;
  const HEART_TOP  = Math.floor((CARD_H - 120) / 2) - 10;

  return await sharp(bg)
    .composite([
      { input: overlay,      top: 0,         left: 0                     },
      { input: husbandAvatar, top: AVATAR_TOP, left: HUSBAND_LEFT         },
      { input: wifeAvatar,    top: AVATAR_TOP, left: WIFE_LEFT            },
      { input: heartSVG,      top: HEART_TOP,  left: HEART_LEFT           },
      { input: hNameSVG,      top: NAME_TOP,   left: HUSBAND_LEFT - 55    },
      { input: wNameSVG,      top: NAME_TOP,   left: WIFE_LEFT    - 55    },
    ])
    .png()
    .toBuffer();
}

class Zawejni {
  constructor() {
    this.name = "زوجني";
    this.author = "HUSSEIN YACOUBI";
    this.description = "يختار زوجاً وزوجة عشوائيين من القروب ويرسل صورة الزوجين";
    this.role = "user";
    this.aliases = ["marry", "زواج"];
    this.hidden = false;
    this._updateCooldown();
  }

  _updateCooldown() {
    this.cooldowns = getConfig().cooldown ?? 120;
  }

  async execute({ api, event }) {
    this._updateCooldown();
    const { threadID, messageID } = event;

    api.setMessageReaction("💍", messageID, () => {}, true);

    let threadInfo;
    try {
      threadInfo = await api.getThreadInfo(threadID);
    } catch {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | تعذّر جلب معلومات المجموعة.", threadID, messageID);
    }

    const botID = api.getCurrentUserID();
    const pool  = (threadInfo.participantIDs || []).filter(id => id !== botID);

    if (pool.length < 2) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | ما في أعضاء كافيين في القروب للتزويج!", threadID, messageID);
    }

    const shuffled  = [...pool].sort(() => Math.random() - 0.5);
    const husbandID = shuffled[0];
    const wifeID    = shuffled[1];

    let husbandName = "الزوج";
    let wifeName    = "الزوجة";
    try {
      const infos = await api.getUserInfo([husbandID, wifeID]);
      husbandName = infos[husbandID]?.name || husbandName;
      wifeName    = infos[wifeID]?.name    || wifeName;
    } catch {}

    let cardBuffer;
    try {
      cardBuffer = await buildCard(husbandID, wifeID, husbandName, wifeName);
    } catch (err) {
      console.error("[زوجني] خطأ في الصورة:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | فشل في تجهيز الصورة، حاول مرة ثانية.", threadID, messageID);
    }

    const tmpPath = path.join(os.tmpdir(), `zawaj_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, cardBuffer);

    const msg = pick(MESSAGES)(husbandName, wifeName);

    try {
      api.setMessageReaction("💕", messageID, () => {}, true);
      await api.sendMessage(
        { body: msg, attachment: fs.createReadStream(tmpPath) },
        threadID,
        messageID
      );
    } finally {
      fs.remove(tmpPath).catch(() => {});
    }
  }
}

export { getConfig, saveConfig };
export default new Zawejni();

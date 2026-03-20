import axios from "axios";
import sharp from "sharp";
import fs from "fs-extra";
import path from "path";
import os from "os";

const CONFIG_PATH = "./database/weddingConfig.json";
const TEMPLATE_PATH = "./cache/pairing.png";
const PROFILE_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
const CIRCLE_SIZE = 200;

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

async function getCircularAvatar(userID) {
  const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=${PROFILE_TOKEN}`;
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
  const mask = Buffer.from(
    `<svg><circle cx="${CIRCLE_SIZE / 2}" cy="${CIRCLE_SIZE / 2}" r="${CIRCLE_SIZE / 2}" /></svg>`
  );
  return await sharp(Buffer.from(res.data))
    .resize(CIRCLE_SIZE, CIRCLE_SIZE, { fit: "cover" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function buildCard(husbandID, wifeID, husbandName, wifeName) {
  const CARD_W = 1000;
  const CARD_H = 500;

  const husbandAvatar = await getCircularAvatar(husbandID);
  const wifeAvatar = await getCircularAvatar(wifeID);

  const template = await sharp(TEMPLATE_PATH)
    .resize(CARD_W, CARD_H, { fit: "cover" })
    .toBuffer();

  const AVATAR_TOP = Math.floor((CARD_H - CIRCLE_SIZE) / 2);
  const HUSBAND_LEFT = 80;
  const WIFE_LEFT = CARD_W - CIRCLE_SIZE - 80;

  const nameFontSize = 36;
  const husbandNameSVG = Buffer.from(`
    <svg width="300" height="60">
      <text x="150" y="45" font-size="${nameFontSize}" font-family="Arial" font-weight="bold"
        fill="white" text-anchor="middle"
        style="text-shadow: 2px 2px 4px #000000; paint-order: stroke;"
        stroke="black" stroke-width="3" stroke-linejoin="round">
        ${husbandName.slice(0, 14)}
      </text>
    </svg>`);

  const wifeNameSVG = Buffer.from(`
    <svg width="300" height="60">
      <text x="150" y="45" font-size="${nameFontSize}" font-family="Arial" font-weight="bold"
        fill="white" text-anchor="middle"
        style="text-shadow: 2px 2px 4px #000000; paint-order: stroke;"
        stroke="black" stroke-width="3" stroke-linejoin="round">
        ${wifeName.slice(0, 14)}
      </text>
    </svg>`);

  const heartSVG = Buffer.from(`
    <svg width="100" height="100">
      <text x="50" y="75" font-size="70" text-anchor="middle">💕</text>
    </svg>`);

  const HEART_LEFT = Math.floor(CARD_W / 2) - 50;
  const HEART_TOP = Math.floor((CARD_H - 100) / 2);

  const NAME_TOP = AVATAR_TOP + CIRCLE_SIZE + 10;
  const HUSBAND_NAME_LEFT = HUSBAND_LEFT - 50;
  const WIFE_NAME_LEFT = WIFE_LEFT - 50;

  const card = await sharp(template)
    .composite([
      { input: husbandAvatar, top: AVATAR_TOP, left: HUSBAND_LEFT },
      { input: wifeAvatar,    top: AVATAR_TOP, left: WIFE_LEFT   },
      { input: heartSVG,      top: HEART_TOP,  left: HEART_LEFT  },
      { input: husbandNameSVG, top: NAME_TOP,  left: HUSBAND_NAME_LEFT },
      { input: wifeNameSVG,    top: NAME_TOP,  left: WIFE_NAME_LEFT    },
    ])
    .png()
    .toBuffer();

  return card;
}

class Zawejni {
  constructor() {
    this.name = "زوجني";
    this.author = "HUSSEIN YACOUBI";
    this.description = "يختار لك زوجة عشوائية من القروب ويرسل صورة الزوجين";
    this.role = "user";
    this.aliases = ["marry", "زواج"];
    this.hidden = false;
    this._updateCooldown();
  }

  _updateCooldown() {
    const cfg = getConfig();
    this.cooldowns = cfg.cooldown ?? 120;
  }

  async execute({ api, event }) {
    this._updateCooldown();
    const { threadID, messageID, senderID } = event;

    api.setMessageReaction("💍", messageID, () => {}, true);

    let threadInfo;
    try {
      threadInfo = await api.getThreadInfo(threadID);
    } catch {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | تعذّر جلب معلومات المجموعة.", threadID, messageID);
    }

    const members = (threadInfo.participantIDs || []).filter(
      id => id !== senderID && id !== api.getCurrentUserID()
    );

    if (members.length === 0) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | ما في أحد ثاني في القروب يصلح يكون زوج/زوجة!", threadID, messageID);
    }

    const wifeID = members[Math.floor(Math.random() * members.length)];

    let husbandName = "الزوج";
    let wifeName    = "الزوجة";
    try {
      const infos = await api.getUserInfo([senderID, wifeID]);
      husbandName = infos[senderID]?.name || husbandName;
      wifeName    = infos[wifeID]?.name    || wifeName;
    } catch {}

    let cardBuffer;
    try {
      cardBuffer = await buildCard(senderID, wifeID, husbandName, wifeName);
    } catch (err) {
      console.error("[زوجني] خطأ في الصورة:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | فشل في تجهيز الصورة، حاول مرة ثانية.", threadID, messageID);
    }

    const tmpPath = path.join(os.tmpdir(), `zawaj_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, cardBuffer);

    try {
      api.setMessageReaction("💕", messageID, () => {}, true);
      await api.sendMessage(
        {
          body: `💍 | مبروك!\n👦 الزوج: ${husbandName}\n👧 الزوجة: ${wifeName}\n\n❤️ بالتوفيق للعروسين!`,
          attachment: fs.createReadStream(tmpPath),
        },
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

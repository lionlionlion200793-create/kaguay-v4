import axios from "axios";
import sharp from "sharp";
import fs from "fs-extra";
import path from "path";
import os from "os";

const CONFIG_PATH    = "./database/weddingConfig.json";
const PROFILE_TOKEN  = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

// ── أبعاد الكارد ──────────────────────────────────────────────────────────────
const CARD_W = 960;
const CARD_H = 480;

// ── مواضع الوجوه على قالب الأنمي (بالنسبة للكارد 960x480) ────────────────────
// الشخصية اليسرى (الولد):  مركز الوجه
const LEFT_FACE  = { cx: 210, cy: 145, r: 105 };
// الشخصية اليمنى (البنت): مركز الوجه
const RIGHT_FACE = { cx: 748, cy: 145, r: 105 };

// ── قوالب الأنمي المتاحة (بوي + قيرل) ────────────────────────────────────────
const ANIME_TEMPLATES = [
  "./cache/anime_pair_1.jpg",
  "./cache/anime_pair_2.jpg",
];

// ── رسائل ────────────────────────────────────────────────────────────────────
function loveBar(p) {
  const f = Math.round(p / 10);
  return "❤️".repeat(f) + "🖤".repeat(10 - f);
}

function loveComment(p) {
  if (p >= 95) return "توافق مثالي، ما أحلى هذا! 🌟";
  if (p >= 80) return "حب قوي وتوافق رائع! 😍";
  if (p >= 60) return "علاقتهم واعدة 🥰";
  if (p >= 40) return "يمكن تنجح إذا حاولوا! 😅";
  if (p >= 20) return "الأمل موجود بس يحتاجون شغل 😬";
  return "ربي يستر عليهم 😂";
}

const MESSAGES = [
  (h, w, p) => `🌹 | القدر جمعهم!\n💍 الزوج: ${h}\n💎 الزوجة: ${w}\n\n💘 نسبة الحب: ${p}%\n${loveBar(p)}\n${loveComment(p)}`,
  (h, w, p) => `💒 | عقد قران!\n🤵 العريس: ${h}\n👰 العروسة: ${w}\n\n💘 نسبة التوافق: ${p}%\n${loveBar(p)}\n${loveComment(p)}`,
  (h, w, p) => `💘 | الحب ضرب!\n👨‍❤️‍👩 ${h} + ${w}\n\n💘 نسبة الحب: ${p}%\n${loveBar(p)}\n${loveComment(p)}`,
  (h, w, p) => `🎀 | إشعار زواج!\n🧑 الزوج: ${h}\n👩 الزوجة: ${w}\n\n💘 نسبة الحب: ${p}%\n${loveBar(p)}\n${loveComment(p)}`,
  (h, w, p) => `🕌 | تم عقد الزواج!\n💑 ${h} 💍 ${w}\n\n💘 نسبة التوافق: ${p}%\n${loveBar(p)}\n${loveComment(p)}`,
];

// ── helpers ───────────────────────────────────────────────────────────────────
function getConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")); }
  catch { return { cooldown: 120 }; }
}
function saveConfig(d) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(d, null, 2)); }
function pick(arr)     { return arr[Math.floor(Math.random() * arr.length)]; }

// بناء صورة دائرية من ID المستخدم
async function circularAvatar(userID, size) {
  const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=${PROFILE_TOKEN}`;
  const res  = await axios.get(url, { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
  const mask = Buffer.from(`<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}"/></svg>`);
  return sharp(Buffer.from(res.data))
    .resize(size, size, { fit: "cover" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

// ── بناء الكارد ───────────────────────────────────────────────────────────────
async function buildCard(husbandID, wifeID, husbandName, wifeName, lovePct) {
  const template = pick(ANIME_TEMPLATES);

  // 1. قالب الأنمي كخلفية
  const bg = await sharp(template)
    .resize(CARD_W, CARD_H, { fit: "cover", position: "centre" })
    .toBuffer();

  // 2. صور الوجوه الدائرية
  const [husbandAvatar, wifeAvatar] = await Promise.all([
    circularAvatar(husbandID, LEFT_FACE.r * 2),
    circularAvatar(wifeID,    RIGHT_FACE.r * 2),
  ]);

  // حدود دائرة الزوج
  const husbandLeft = LEFT_FACE.cx - LEFT_FACE.r;
  const husbandTop  = LEFT_FACE.cy - LEFT_FACE.r;

  // حدود دائرة الزوجة
  const wifeLeft = RIGHT_FACE.cx - RIGHT_FACE.r;
  const wifeTop  = RIGHT_FACE.cy - RIGHT_FACE.r;

  // 3. حلقة بيضاء خلف كل وجه (كإطار)
  const ringH = Buffer.from(`
    <svg width="${LEFT_FACE.r*2+12}" height="${LEFT_FACE.r*2+12}">
      <circle cx="${LEFT_FACE.r+6}" cy="${LEFT_FACE.r+6}" r="${LEFT_FACE.r+5}"
        fill="none" stroke="white" stroke-width="5" opacity="0.85"/>
    </svg>`);
  const ringW = Buffer.from(`
    <svg width="${RIGHT_FACE.r*2+12}" height="${RIGHT_FACE.r*2+12}">
      <circle cx="${RIGHT_FACE.r+6}" cy="${RIGHT_FACE.r+6}" r="${RIGHT_FACE.r+5}"
        fill="none" stroke="white" stroke-width="5" opacity="0.85"/>
    </svg>`);

  // 4. اسم الزوج (يسار) والزوجة (يمين)
  const FS = 28;
  function nameSVG(name) {
    const safe = name.slice(0, 14).replace(/&/g,"&amp;").replace(/</g,"&lt;");
    return Buffer.from(`
      <svg width="260" height="50">
        <text x="130" y="37" font-size="${FS}" font-family="Arial" font-weight="bold"
          fill="white" text-anchor="middle" paint-order="stroke"
          stroke="#111" stroke-width="4" stroke-linejoin="round">${safe}</text>
      </svg>`);
  }

  const NAME_Y  = LEFT_FACE.cy + LEFT_FACE.r + 18;
  const hNameLeft = husbandLeft - 20;
  const wNameLeft = wifeLeft    - 20;

  // 5. شريط نسبة الحب
  const BAR_W  = 380;
  const BAR_H  = 36;
  const fill   = Math.round((lovePct / 100) * BAR_W);
  const barClr = lovePct >= 80 ? "#ff4d6d" : lovePct >= 50 ? "#ff9f43" : "#a29bfe";
  const barSVG = Buffer.from(`
    <svg width="${BAR_W}" height="${BAR_H}">
      <rect width="${BAR_W}" height="${BAR_H}" rx="18" fill="#00000077"/>
      <rect width="${fill}"  height="${BAR_H}" rx="18" fill="${barClr}"/>
      <text x="${BAR_W/2}" y="25" font-size="17" font-family="Arial" font-weight="bold"
        fill="white" text-anchor="middle" paint-order="stroke"
        stroke="#00000099" stroke-width="2">❤ ${lovePct}%</text>
    </svg>`);

  const BAR_LEFT = Math.floor((CARD_W - BAR_W) / 2);
  const BAR_TOP  = CARD_H - 60;

  // ── تركيب الكل ──
  return sharp(bg)
    .composite([
      // حلقات إطار
      { input: ringH, top: husbandTop - 6, left: husbandLeft - 6 },
      { input: ringW, top: wifeTop    - 6, left: wifeLeft    - 6 },
      // صور الوجوه
      { input: husbandAvatar, top: husbandTop, left: husbandLeft },
      { input: wifeAvatar,    top: wifeTop,    left: wifeLeft    },
      // أسماء
      { input: nameSVG(husbandName), top: NAME_Y, left: hNameLeft },
      { input: nameSVG(wifeName),    top: NAME_Y, left: wNameLeft  },
      // شريط الحب
      { input: barSVG, top: BAR_TOP, left: BAR_LEFT },
    ])
    .png()
    .toBuffer();
}

// ── الكلاس ────────────────────────────────────────────────────────────────────
class Zawejni {
  constructor() {
    this.name        = "زوجني";
    this.author      = "HUSSEIN YACOUBI";
    this.description = "يزوجك مع شخص عشوائي من القروب بصورة أنمي مع نسبة الحب";
    this.role        = "user";
    this.aliases     = ["marry", "زواج"];
    this.hidden      = false;
    this.cooldowns   = getConfig().cooldown ?? 120;
  }

  async execute({ api, event }) {
    this.cooldowns = getConfig().cooldown ?? 120;
    const { threadID, messageID, senderID } = event;

    api.setMessageReaction("💍", messageID, () => {}, true);

    // جلب أعضاء القروب
    let threadInfo;
    try {
      threadInfo = await api.getThreadInfo(threadID);
    } catch {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | تعذّر جلب معلومات المجموعة.", threadID, messageID);
    }

    const botID  = api.getCurrentUserID();
    const others = (threadInfo.participantIDs || []).filter(
      id => id !== senderID && id !== botID
    );

    if (others.length === 0) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | ما في أحد ثاني في القروب يصلح يكون زوج/زوجة!", threadID, messageID);
    }

    // الشريك عشوائي من بقية الأعضاء
    const partnerID = others[Math.floor(Math.random() * others.length)];

    // تعيين عشوائي: من هو الزوج ومن هي الزوجة
    const [husbandID, wifeID] = Math.random() < 0.5
      ? [senderID, partnerID]
      : [partnerID, senderID];

    // جلب الأسماء
    let husbandName = "الزوج", wifeName = "الزوجة";
    try {
      const infos = await api.getUserInfo([husbandID, wifeID]);
      husbandName  = infos[husbandID]?.name || husbandName;
      wifeName     = infos[wifeID]?.name    || wifeName;
    } catch {}

    // توليد نسبة الحب
    const lovePct = Math.floor(Math.random() * 101);

    // بناء الصورة
    let card;
    try {
      card = await buildCard(husbandID, wifeID, husbandName, wifeName, lovePct);
    } catch (err) {
      console.error("[زوجني] خطأ في الصورة:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | فشل في تجهيز الصورة، حاول مرة ثانية.", threadID, messageID);
    }

    const tmpPath = path.join(os.tmpdir(), `zawaj_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, card);

    const msg = pick(MESSAGES)(husbandName, wifeName, lovePct);

    try {
      api.setMessageReaction("💕", messageID, () => {}, true);
      await api.sendMessage(
        { body: msg, attachment: fs.createReadStream(tmpPath) },
        threadID, messageID
      );
    } finally {
      fs.remove(tmpPath).catch(() => {});
    }
  }
}

export { getConfig, saveConfig };
export default new Zawejni();

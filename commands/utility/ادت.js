import axios from "axios";
import fs from "fs-extra";
import path from "path";
import os from "os";

async function searchTikTok(query, count = 5) {
  const res = await axios.get("https://tikwm.com/api/feed/search", {
    params: { keywords: query, count, cursor: 0, web: 1, HD: 1 },
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return res.data?.data?.videos || [];
}

async function downloadVideo(url, dest) {
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 30000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    res.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

class Edit {
  constructor() {
    this.name = "ادت";
    this.author = "HUSSEIN YACOUBI";
    this.cooldowns = 10;
    this.description = "جلب فيديو ادت لشخصية من تيك توك — مثال: *ادت shadow";
    this.role = "member";
    this.aliases = ["edit", "ادتات"];
    this.hidden = false;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;

    if (!args || args.length === 0) {
      return api.sendMessage(
        "📌 | اكتب اسم الشخصية بالإنجليزي\nمثال: *ادت shadow",
        threadID,
        messageID
      );
    }

    const character = args.join(" ").trim();
    const query = `${character} edit`;

    api.setMessageReaction("🔍", messageID, () => {}, true);

    let videos = [];
    try {
      videos = await searchTikTok(query);
    } catch {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | فشل الاتصال، حاول مرة ثانية.", threadID, messageID);
    }

    if (!videos.length) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`❌ | ما لقيت أي ادت لـ "${character}".`, threadID, messageID);
    }

    // اختار فيديو عشوائي من أول 5 نتائج
    const picked = videos[Math.floor(Math.random() * Math.min(videos.length, 5))];
    const videoUrl = picked.play || picked.wmplay;

    if (!videoUrl) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | ما قدرت أجيب الفيديو، جرب مرة ثانية.", threadID, messageID);
    }

    const tmpFile = path.join(os.tmpdir(), `edit_${Date.now()}.mp4`);

    try {
      await downloadVideo(videoUrl, tmpFile);

      const stats = fs.statSync(tmpFile);
      if (stats.size < 5000) throw new Error("الملف صغير جداً");

      api.setMessageReaction("✅", messageID, () => {}, true);

      await api.sendMessage(
        {
          body: `🎬 | ${character} edit`,
          attachment: fs.createReadStream(tmpFile),
        },
        threadID,
        messageID
      );

    } catch (err) {
      console.error("[ادت] خطأ:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | ما قدرت أرسل الفيديو، جرب مرة ثانية.", threadID, messageID);
    } finally {
      fs.remove(tmpFile).catch(() => {});
    }
  }
}

export default new Edit();

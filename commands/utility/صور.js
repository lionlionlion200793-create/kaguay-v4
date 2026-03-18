import axios from "axios";
import fs from "fs-extra";
import path from "path";
import pkg from "cheerio";
const { load } = pkg;

class ImageSearch {
  constructor() {
    this.name = "صور";
    this.author = "William";
    this.cooldowns = 15;
    this.description = "البحث عن صور وإرسال 6 منها";
    this.role = "user";
    this.aliases = ["بحث صور", "img", "image", "images", "pinterest", "بينتريست"];
  }

  async searchImages(query) {
    const res = await axios.get("https://www.bing.com/images/search", {
      params: { q: query, form: "HDRSC2", first: "1", tsc: "ImageBasicHover" },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Referer": "https://www.bing.com/",
      },
      timeout: 20000,
    });

    const $ = load(res.data);
    const urls = [];

    $("a.iusc").each((_, el) => {
      try {
        const m = $(el).attr("m");
        if (m) {
          const json = JSON.parse(m);
          if (json.murl) urls.push(json.murl);
        }
      } catch (_) {}
    });

    if (urls.length === 0) {
      $("img.mimg").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src && src.startsWith("http")) urls.push(src);
      });
    }

    return urls.slice(0, 9);
  }

  async downloadImage(url, filePath) {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.bing.com/",
      },
    });
    await fs.outputFile(filePath, res.data);
  }

  async execute({ api, event }) {
    const { threadID, messageID, body } = event;

    const query = body
      .replace(/^(صور|بحث صور|img|image|images|pinterest|بينتريست)\s*/i, "")
      .trim();

    if (!query) {
      return api.sendMessage(
        "❌ | اكتب الكلمة التي تريد البحث عنها.\n📌 مثال: صور غروب الشمس",
        threadID,
        messageID
      );
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);

    const tempDir = path.join(process.cwd(), "temp");
    await fs.ensureDir(tempDir);

    const tempFiles = [];

    try {
      const imageUrls = await this.searchImages(query);

      if (!imageUrls || imageUrls.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ | لم أجد أي صور لهذا البحث.", threadID, messageID);
      }

      const downloadResults = await Promise.allSettled(
        imageUrls.map(async (url, i) => {
          const filePath = path.join(tempDir, `img_${Date.now()}_${i}.jpg`);
          await this.downloadImage(url, filePath);
          tempFiles.push(filePath);
          return filePath;
        })
      );

      const successFiles = downloadResults
        .filter(r => r.status === "fulfilled")
        .map(r => r.value)
        .slice(0, 6);

      if (successFiles.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ | فشل تحميل الصور، حاول مرة أخرى.", threadID, messageID);
      }

      await api.sendMessage(
        {
          body:
            `🖼️ | نتائج البحث عن: ${query}\n` +
            `📊 تم إيجاد ${successFiles.length} صورة`,
          attachment: successFiles.map(f => fs.createReadStream(f)),
        },
        threadID,
        messageID
      );

      api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (err) {
      console.error("[صور] خطأ:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "❌ | حدث خطأ أثناء البحث عن الصور، حاول لاحقاً.",
        threadID,
        messageID
      );
    } finally {
      for (const f of tempFiles) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
      }
    }
  }
}

export default new ImageSearch();

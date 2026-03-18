import axios from "axios";
import fs from "fs-extra";
import path from "path";

class ImageSearch {
  constructor() {
    this.name = "صور";
    this.author = "William";
    this.cooldowns = 15;
    this.description = "البحث عن صور من بينتريست وإرسال 6 منها";
    this.role = "user";
    this.aliases = ["بحث صور", "img", "image", "images", "pinterest", "بينتريست"];
  }

  async searchPinterest(query) {
    const timestamp = Date.now();
    const data = JSON.stringify({
      options: {
        query: query,
        scope: "pins",
        page_size: 18,
        no_fetch_context_on_resource: false,
      },
      context: {},
    });

    const res = await axios.get("https://www.pinterest.com/resource/BaseSearchResource/get/", {
      params: {
        source_url: `/search/pins/?q=${encodeURIComponent(query)}&rs=typed`,
        data: data,
        _: timestamp,
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*, q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
        "X-Requested-With": "XMLHttpRequest",
        "X-Pinterest-AppState": "active",
      },
      timeout: 20000,
    });

    const results = res.data?.resource_response?.data?.results || [];

    const urls = [];
    for (const pin of results) {
      const img =
        pin?.images?.["736x"]?.url ||
        pin?.images?.orig?.url ||
        pin?.images?.["474x"]?.url ||
        null;
      if (img) urls.push(img);
      if (urls.length >= 6) break;
    }

    return urls;
  }

  async downloadImage(url, filePath) {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.pinterest.com/",
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
      const imageUrls = await this.searchPinterest(query);

      if (!imageUrls || imageUrls.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(
          "❌ | لم أجد أي صور لهذا البحث في بينتريست.",
          threadID,
          messageID
        );
      }

      const downloadResults = await Promise.allSettled(
        imageUrls.map(async (url, i) => {
          const filePath = path.join(tempDir, `pin_${Date.now()}_${i}.jpg`);
          await this.downloadImage(url, filePath);
          tempFiles.push(filePath);
          return filePath;
        })
      );

      const successFiles = downloadResults
        .filter(r => r.status === "fulfilled")
        .map(r => r.value);

      if (successFiles.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(
          "❌ | فشل تحميل الصور، حاول مرة أخرى.",
          threadID,
          messageID
        );
      }

      await api.sendMessage(
        {
          body:
            `📌 | بينتريست - نتائج: ${query}\n` +
            `🖼️ تم إيجاد ${successFiles.length} صورة`,
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
        "❌ | حدث خطأ أثناء البحث في بينتريست، حاول لاحقاً.",
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

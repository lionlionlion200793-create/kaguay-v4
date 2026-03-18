import axios from "axios";
import fs from "fs-extra";
import path from "path";

class ImageSearch {
  constructor() {
    this.name = "صور";
    this.author = "William";
    this.cooldowns = 15;
    this.description = "البحث عن صور وإرسال 6 منها";
    this.role = "user";
    this.aliases = ["بحث صور", "img", "image", "images"];
  }

  async getVqd(query) {
    const res = await axios.get("https://duckduckgo.com/", {
      params: { q: query, ia: "images" },
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 10000,
    });
    const match = res.data.match(/vqd=([\d-]+)/);
    return match ? match[1] : null;
  }

  async searchImages(query) {
    const vqd = await this.getVqd(query);
    if (!vqd) throw new Error("تعذّر الحصول على رمز البحث");

    const res = await axios.get("https://duckduckgo.com/i.js", {
      params: { l: "us-en", o: "json", q: query, vqd, f: ",,,,,", p: "1" },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://duckduckgo.com/",
      },
      timeout: 15000,
    });

    return (res.data?.results || []).slice(0, 6).map(r => r.image);
  }

  async downloadImage(url, filePath) {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    await fs.outputFile(filePath, res.data);
  }

  async execute({ api, event }) {
    const { threadID, messageID, body } = event;

    const query = body.replace(/^(صور|بحث صور|img|image|images)\s*/i, "").trim();

    if (!query) {
      return api.sendMessage(
        "❌ | اكتب الكلمة التي تريد البحث عنها.\n📌 مثال: صور قطط",
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
        .map(r => r.value);

      if (successFiles.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ | فشل تحميل الصور، حاول مرة أخرى.", threadID, messageID);
      }

      await api.sendMessage(
        {
          body: `🖼️ | نتائج البحث عن: ${query}\n📊 تم إيجاد ${successFiles.length} صورة`,
          attachment: successFiles.map(f => fs.createReadStream(f)),
        },
        threadID,
        messageID
      );

      api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (err) {
      console.error("[صور] خطأ:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | حدث خطأ أثناء البحث عن الصور، حاول لاحقاً.", threadID, messageID);
    } finally {
      for (const f of tempFiles) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
      }
    }
  }
}

export default new ImageSearch();

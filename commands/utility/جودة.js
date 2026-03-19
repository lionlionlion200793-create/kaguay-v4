import axios from "axios";
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

class ImageQuality {
  constructor() {
    this.name = "جودة";
    this.author = "Kaguya Project";
    this.cooldowns = 15;
    this.description = "تحسين جودة صورة عند الرد عليها ورفعها لجودة عالية";
    this.role = "user";
    this.aliases = ["enhance", "upscale", "hd", "4k"];
  }

  async execute({ api, event }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply) {
      return api.sendMessage(
        "❌ | رُد على صورة لتحسين جودتها.\n\n📌 طريقة الاستخدام:\n  رد على صورة + *جودة",
        threadID,
        messageID
      );
    }

    const attachments = messageReply.attachments || [];
    const image = attachments.find(a => a.type === "photo" || a.type === "sticker");

    if (!image) {
      return api.sendMessage(
        "❌ | الرسالة التي رددت عليها لا تحتوي على صورة.",
        threadID,
        messageID
      );
    }

    const imageUrl = image.largePreviewUrl || image.previewUrl || image.url;
    if (!imageUrl) {
      return api.sendMessage("❌ | تعذّر الحصول على رابط الصورة.", threadID, messageID);
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const tempPath = path.join(process.cwd(), "temp", `quality_${Date.now()}.png`);

    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const buffer = Buffer.from(response.data);
      const metadata = await sharp(buffer).metadata();

      const origW = metadata.width || 800;
      const origH = metadata.height || 800;

      const MAX_SIZE = 4096;
      const scale = Math.min(MAX_SIZE / origW, MAX_SIZE / origH, 4);
      const newWidth = Math.round(origW * scale);
      const newHeight = Math.round(origH * scale);

      await sharp(buffer)
        .resize(newWidth, newHeight, {
          kernel: sharp.kernel.lanczos3,
          fastShrinkOnLoad: false
        })
        .sharpen({ sigma: 1.5, m1: 2, m2: 0.3 })
        .png({ compressionLevel: 1, quality: 100 })
        .toFile(tempPath);

      await api.sendMessage(
        {
          body:
            `✅ | تمت رفع الجودة!\n` +
            `📐 ${origW}×${origH} ➜ ${newWidth}×${newHeight}`,
          attachment: [fs.createReadStream(tempPath)],
        },
        threadID,
        messageID
      );

      api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (err) {
      console.error("[جودة] خطأ:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ | حدث خطأ أثناء معالجة الصورة.", threadID, messageID);
    } finally {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
    }
  }
}

export default new ImageQuality();

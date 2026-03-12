import axios from "axios";
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

class ImageQuality {
  constructor() {
    this.name = "جودة";
    this.author = "Kaguya Project";
    this.cooldowns = 15;
    this.description = "تحسين جودة صورة عند الرد عليها";
    this.role = "member";
    this.aliases = ["enhance", "upscale", "hd"];
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

    const tempPath = path.join(process.cwd(), "temp", `quality_${Date.now()}.jpg`);

    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const buffer = Buffer.from(response.data);

      const metadata = await sharp(buffer).metadata();
      const newWidth = (metadata.width || 800) * 2;
      const newHeight = (metadata.height || 800) * 2;

      await sharp(buffer)
        .resize(newWidth, newHeight, {
          kernel: sharp.kernel.lanczos3,
          fastShrinkOnLoad: false
        })
        .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.7 })
        .jpeg({ quality: 95, mozjpeg: true })
        .toFile(tempPath);

      await api.sendMessage(
        {
          body: "✅ | تم تحسين جودة الصورة! 🖼️\n📐 الأبعاد الجديدة: " + newWidth + "×" + newHeight,
          attachment: [fs.createReadStream(tempPath)],
        },
        threadID,
        messageID
      );

      api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (err) {
      console.error("[جودة] خطأ:", err);
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

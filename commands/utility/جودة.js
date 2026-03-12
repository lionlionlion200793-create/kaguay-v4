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

  async execute({ api, event, args }) {
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
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const buffer = Buffer.from(response.data);
      const metadata = await sharp(buffer).metadata();

      const origW = metadata.width || 800;
      const origH = metadata.height || 800;
      const newWidth = origW * 2;
      const newHeight = origH * 2;

      await sharp(buffer)
        .resize(newWidth, newHeight, {
          kernel: sharp.kernel.lanczos3,
          fastShrinkOnLoad: false
        })
        .sharpen({ sigma: 2.5, m1: 3, m2: 0.5 })
        .modulate({ saturation: 1.3, brightness: 1.05 })
        .linear(1.2, -(128 * 0.2))
        .toFormat("jpeg", { quality: 95 })
        .toFile(tempPath);

      await api.sendMessage(
        {
          body:
            `✅ | تم تحسين الصورة!\n` +
            `📐 الأبعاد: ${origW}×${origH} ➜ ${newWidth}×${newHeight}\n` +
            `🎨 حدة + إشباع + تباين محسّن`,
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

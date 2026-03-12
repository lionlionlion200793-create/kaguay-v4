import axios from "axios";
import fs from "fs-extra";
import path from "path";
import Jimp from "jimp";

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
        "❌ | رُد على صورة لتحسين جودتها.\n\n📌 طريقة الاستخدام:\n  رد على صورة + جودة",
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
      const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
      const buffer = Buffer.from(response.data);

      const img = await Jimp.read(buffer);

      const newWidth = img.getWidth() * 2;
      const newHeight = img.getHeight() * 2;

      img
        .resize(newWidth, newHeight, Jimp.RESIZE_BICUBIC)
        .convolute([
          [-0.5, -0.5, -0.5],
          [-0.5,  5,   -0.5],
          [-0.5, -0.5, -0.5]
        ])
        .quality(100);

      await img.writeAsync(tempPath);

      await api.sendMessage(
        {
          body: "✅ | تم تحسين جودة الصورة بنجاح! 🖼️",
          attachment: fs.createReadStream(tempPath),
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
        fs.unlinkSync(tempPath);
      }
    }
  }
}

export default new ImageQuality();

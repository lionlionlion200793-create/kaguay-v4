import axios from "axios";
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

class ImageQuality {
  constructor() {
    this.name        = "جودة";
    this.author      = "Kaguya Project";
    this.cooldowns   = 15;
    this.description = "تحسين جودة الصورة بشكل طبيعي واحترافي (حدة، ألوان، تباين، إضاءة)";
    this.role        = "user";
    this.aliases     = ["enhance", "upscale", "hd", "4k"];
  }

  async execute({ api, event }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply) {
      return api.sendMessage(
        "❌ | رُد على صورة لتحسين جودتها.\n\n📌 طريقة الاستخدام:\n  رد على صورة + *جودة",
        threadID, messageID
      );
    }

    const attachments = messageReply.attachments || [];
    const image = attachments.find(a => a.type === "photo" || a.type === "sticker");

    if (!image) {
      return api.sendMessage(
        "❌ | الرسالة التي رددت عليها لا تحتوي على صورة.",
        threadID, messageID
      );
    }

    const imageUrl = image.largePreviewUrl || image.previewUrl || image.url;
    if (!imageUrl) {
      return api.sendMessage("❌ | تعذّر الحصول على رابط الصورة.", threadID, messageID);
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const tempPath = path.join(process.cwd(), "temp", `quality_${Date.now()}.png`);

    try {
      // ── تحميل الصورة ──────────────────────────────────────────────────────
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const buffer   = Buffer.from(response.data);
      const metadata = await sharp(buffer).metadata();

      const origW = metadata.width  || 800;
      const origH = metadata.height || 800;

      // الحد الأقصى 4096 × 4 — لا نرفع أكثر من 4 أضعاف الأصل
      const MAX_SIZE = 4096;
      const scale    = Math.min(MAX_SIZE / origW, MAX_SIZE / origH, 4);
      const newW     = Math.round(origW * scale);
      const newH     = Math.round(origH * scale);

      // ── تحليل الإضاءة لاتخاذ قرار التعديل ───────────────────────────────
      const stats = await sharp(buffer)
        .resize(200, 200, { fit: "inside" })  // عينة صغيرة للسرعة
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data: rawData, info: rawInfo } = stats;
      const totalPixels = rawInfo.width * rawInfo.height;
      let sumLuminance  = 0;

      for (let i = 0; i < rawData.length; i += rawInfo.channels) {
        const r = rawData[i], g = rawData[i + 1], b = rawData[i + 2];
        // معادلة الإضاءة الإدراكية
        sumLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }

      const avgLuminance = sumLuminance / totalPixels; // 0–255
      const isDark       = avgLuminance < 90;          // أقل من ~35% تعتبر داكنة

      // ── بناء pipeline التحسين ────────────────────────────────────────────
      //
      //  1. Upscale    — رفع الدقة بـ Lanczos3 (أفضل kernel للتكبير)
      //  2. Sharpen    — حدة متوازنة: sigma=0.7 (نطاق ضيق) m1=0.5 (حواف) m2=0.15 (تفاصيل دقيقة)
      //  3. Modulate   — تشبع +8%  +  إضاءة خفيفة إن كانت الصورة داكنة
      //  4. Linear     — تباين +7% مع تثبيت النقطة الوسطى (لا يحرق الألوان)
      //
      const brightnessBoost = isDark ? 1.05 : 1.0;
      // linear(a, b): output = input * a + b
      // نثبت النقطة الوسطى 128: b = -128 * (a-1) = -128 * 0.07 ≈ -8.96
      const contrastA = 1.07;
      const contrastB = -(128 * (contrastA - 1)); // ≈ -8.96

      await sharp(buffer)
        .resize(newW, newH, {
          kernel: sharp.kernel.lanczos3,
          fastShrinkOnLoad: false
        })
        // حدة خفيفة طبيعية — sigma صغير يتجنب المبالغة
        .sharpen({ sigma: 0.7, m1: 0.5, m2: 0.15 })
        // تشبع وإضاءة
        .modulate({
          brightness: brightnessBoost,
          saturation: 1.08            // +8% تشبع
        })
        // تباين خفيف
        .linear(contrastA, contrastB)
        .png({ compressionLevel: 1, quality: 100 })
        .toFile(tempPath);

      // ── بناء ملاحظات التحسين ─────────────────────────────────────────────
      const notes = [
        `🔍 الحدة: متوازنة (sigma 0.7)`,
        `🎨 التشبع: +8%`,
        `📊 التباين: +7%`,
      ];
      if (isDark) notes.push(`💡 الإضاءة: تم رفعها (+5%) لأن الصورة كانت داكنة`);

      await api.sendMessage(
        {
          body:
            `✅ | تم التحسين الاحترافي!\n` +
            `📐 ${origW}×${origH} ➜ ${newW}×${newH}\n\n` +
            notes.join("\n"),
          attachment: [fs.createReadStream(tempPath)],
        },
        threadID, messageID
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

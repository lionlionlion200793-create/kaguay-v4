import fs from "fs-extra";

const filePath = "./database/threads.json";

function readThreads() {
  try { return JSON.parse(fs.readFileSync(filePath, "utf-8")); } catch { return []; }
}

function writeThreads(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

class AiRestrict {
  constructor() {
    this.name = "تقييد-ذكاء";
    this.aliases = ["airestrict", "تقييد_ذكاء", "قيد-ذكاء"];
    this.description = "تقييد أو رفع التقييد عن الذكاء الاصطناعي في قروب معين أو كل القروبات";
    this.role = "owner";
    this.cooldowns = 3;
    this.hidden = true;
  }

  async execute({ api, event, args }) {
    const { threadID, messageID } = event;

    const threads = readThreads();

    const subCmd = args[0];
    const isAll = args[1] === "كل" || args[1] === "الكل" || args[0] === "كل" || args[0] === "الكل";
    const isLift = subCmd === "رفع" || subCmd === "فك" || subCmd === "lift" || subCmd === "off";
    const isRestrict = !isLift && (subCmd === "تقييد" || subCmd === "قيد" || subCmd === "on" || !subCmd);

    if (!subCmd) {
      return api.sendMessage(
        "📌 طريقة الاستخدام:\n" +
        "  *تقييد-ذكاء تقييد          ← يقيد الذكاء في القروب الحالي\n" +
        "  *تقييد-ذكاء رفع            ← يرفع التقييد عن القروب الحالي\n" +
        "  *تقييد-ذكاء تقييد الكل     ← يقيد الذكاء في كل القروبات\n" +
        "  *تقييد-ذكاء رفع الكل       ← يرفع التقييد عن كل القروبات",
        threadID, messageID
      );
    }

    if (isAll) {
      let changed = 0;
      for (let i = 0; i < threads.length; i++) {
        if (!threads[i].data) threads[i].data = {};
        const was = threads[i].data.aiRestricted;
        threads[i].data.aiRestricted = isRestrict;
        if (was !== isRestrict) changed++;
      }
      writeThreads(threads);
      return api.sendMessage(
        `${isRestrict ? "🚫" : "✅"} | تم ${isRestrict ? "تقييد" : "رفع تقييد"} الذكاء الاصطناعي في ${changed} قروب.`,
        threadID, messageID
      );
    }

    const targetTID = (args[isLift ? 1 : 1] && /^\d+$/.test(args[isLift ? 1 : 1]))
      ? args[isLift ? 1 : 1]
      : threadID;

    const index = threads.findIndex(t => t.threadID == targetTID);
    if (index === -1) {
      return api.sendMessage(
        `❌ | القروب ${targetTID !== threadID ? targetTID + " " : ""}غير موجود في قاعدة البيانات.`,
        threadID, messageID
      );
    }

    if (!threads[index].data) threads[index].data = {};
    threads[index].data.aiRestricted = isRestrict;
    writeThreads(threads);

    const groupName = threads[index].data?.name || targetTID;
    return api.sendMessage(
      `${isRestrict ? "🚫" : "✅"} | تم ${isRestrict ? "تقييد" : "رفع تقييد"} الذكاء الاصطناعي في: ${groupName}`,
      threadID, messageID
    );
  }
}

export default new AiRestrict();

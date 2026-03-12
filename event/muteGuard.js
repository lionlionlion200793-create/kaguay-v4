import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUTE_FILE = path.join(__dirname, "../cache/data/mutedThreads.json");

function loadMuteData() {
  try {
    if (!fs.existsSync(MUTE_FILE)) return {};
    return JSON.parse(fs.readFileSync(MUTE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveMuteData(data) {
  try {
    fs.mkdirSync(path.dirname(MUTE_FILE), { recursive: true });
    fs.writeFileSync(MUTE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

export default {
  name: "muteGuard",
  execute: async ({ api, event }) => {
    try {
      const { type, threadID, senderID, isGroup } = event;

      if (!isGroup) return;
      if (type !== "message" && type !== "message_reply") return;

      const muteData = loadMuteData();
      const tid = String(threadID);

      if (!muteData[tid]?.active) return;

      const config = global.client?.config || {};
      const botID = String(api.getCurrentUserID());
      const allowedIDs = (muteData[tid].allowedIDs || []).map(String);
      const ownerIDs = (config.ADMIN_IDS || []).map(String);
      const senderStr = String(senderID);

      if (
        senderStr === botID ||
        allowedIDs.includes(senderStr) ||
        ownerIDs.includes(senderStr)
      ) {
        return;
      }

      let senderName = senderStr;
      try {
        const info = await api.getUserInfo(senderStr);
        senderName = info?.[senderStr]?.name || senderStr;
      } catch {}

      try {
        await api.removeUserFromGroup(senderStr, threadID);

        if (!muteData[tid].kickedUsers) muteData[tid].kickedUsers = {};
        muteData[tid].kickedUsers[senderStr] = { name: senderName, kickedAt: Date.now() };
        saveMuteData(muteData);
      } catch (err) {
        console.error("[muteGuard] فشل الطرد:", err?.message || err);
      }

    } catch (err) {
      console.error("[muteGuard] خطأ:", err);
    }
  },
};

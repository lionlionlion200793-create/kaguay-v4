class Protect {
  constructor() {
    this.name = "حماية";
    this.author = "Kaguya Project";
    this.cooldowns = 5;
    this.description = "Manage group protections (name / image / nicknames)";
    this.role = "admin";
    this.aliases = ["protect", "حمايه"];
    this.hidden = true;
  }

  async execute({ api, event, args, Threads }) {
    const { threadID, messageID } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | This command only works in groups.", threadID, messageID);
    }

    const threadsData = await Threads.find(threadID);
    if (!threadsData?.status || !threadsData?.data) {
      return api.sendMessage(
        "❌ | Group not found in database. Send any message and try again.",
        threadID, messageID
      );
    }

    const threads = threadsData.data.data;
    const anti = threads?.anti || {};
    const sub = args[0];

    if (!sub) {
      const nameStatus     = anti.nameBox     ? "✅ Enabled" : "❌ Disabled";
      const imageStatus    = anti.imageBox    ? "✅ Enabled" : "❌ Disabled";
      const nicknameStatus = anti.nicknameBox ? "✅ Enabled" : "❌ Disabled";

      return api.sendMessage(
        `╔══════════════════╗\n` +
        `║   🛡️ Protection Status   ║\n` +
        `╚══════════════════╝\n` +
        `🔤 Name Protection:     ${nameStatus}\n` +
        `🖼️ Image Protection:    ${imageStatus}\n` +
        `🏷️ Nickname Protection: ${nicknameStatus}\n` +
        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
        `📌 To enable/disable:\n` +
        `  *حماية name\n` +
        `  *حماية image\n` +
        `  *حماية nickname`,
        threadID, messageID
      );
    }

    // Name protection
    if (sub === "اسم" || sub === "name") {
      const newValue = !anti.nameBox;
      await Threads.update(threadID, {
        anti: { ...anti, nameBox: newValue },
      });
      return api.sendMessage(
        `🔤 | Group Name Protection: ${newValue ? "✅ Enabled" : "❌ Disabled"}\n` +
        (newValue
          ? `📌 | Any name change will be automatically reverted to:\n「${threads.name || "Current Name"}」`
          : "📌 | Group name can now be changed freely."),
        threadID, messageID
      );
    }

    // Image protection
    if (sub === "صورة" || sub === "image") {
      if (!anti.imageBox && !threads.threadThumbnail) {
        return api.sendMessage(
          "❌ | No saved group image found.\n📌 | Make sure the group has an image and try again.",
          threadID, messageID
        );
      }
      const newValue = !anti.imageBox;
      await Threads.update(threadID, {
        anti: { ...anti, imageBox: newValue },
      });
      return api.sendMessage(
        `🖼️ | Group Image Protection: ${newValue ? "✅ Enabled" : "❌ Disabled"}\n` +
        (newValue
          ? "📌 | Any image change will be automatically reverted to the original."
          : "📌 | Group image can now be changed freely."),
        threadID, messageID
      );
    }

    // Nickname protection
    if (sub === "كنية" || sub === "كنيات" || sub === "nickname") {
      const newValue = !anti.nicknameBox;
      await Threads.update(threadID, {
        anti: { ...anti, nicknameBox: newValue },
      });
      return api.sendMessage(
        `🏷️ | Nickname Protection: ${newValue ? "✅ Enabled" : "❌ Disabled"}\n` +
        (newValue
          ? "📌 | No one can change their nickname or others' nicknames."
          : "📌 | Nicknames can now be changed freely."),
        threadID, messageID
      );
    }

    return api.sendMessage(
      "❌ | Invalid option.\n\n📌 Available options:\n  *حماية name\n  *حماية image\n  *حماية nickname",
      threadID, messageID
    );
  }
}

export default new Protect();

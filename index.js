// استيراد الحزم والملفات الضرورية
import fs from "fs";
import login from "./logins/fcax/fb-chat-api/index.js";
import { listen } from "./listen/listen.js";
import { commandMiddleware, eventMiddleware } from "./middleware/index.js";
import sleep from "time-sleep";
import { log, notifer } from "./logger/index.js";
import gradient from "gradient-string";
import config from "./KaguyaSetUp/config.js";
import EventEmitter from "events";
import axios from "axios";
import semver from "semver";

class Kaguya extends EventEmitter {
  constructor() {
    super();
    this.on("system:error", (err) => {
      log([{ message: "[ ERROR ]: ", color: "red" }, { message: `Error! An error occurred: ${err}`, color: "white" }]);
      process.exit(1);
    });
    this.currentConfig = config;
    this.credentials = fs.readFileSync("./KaguyaSetUp/KaguyaState.json");
    this.package = JSON.parse(fs.readFileSync("./package.json"));
    this.checkCredentials();
  }

  checkCredentials() {
    try {
      const credentialsArray = JSON.parse(this.credentials);
      if (!Array.isArray(credentialsArray) || credentialsArray.length === 0) {
        this.emit("system:error", "Fill in appstate in KaguyaSetUp/KaguyaState.json!");
        process.exit(0);
      }
    } catch (error) {
      this.emit("system:error", "Cannot parse JSON credentials in KaguyaSetUp/KaguyaState.json");
    }
  }
  async checkVersion() {
    try {
        const pinkGradient = gradient(["#ff00ff", "#ff99ff"]);
        console.log(pinkGradient(`       
█▄▀ ▄▀█ █▀▀ █░█ █▄█ ▄▀█
█░█ █▀█ █▄█ █▄█ ░█░ █▀█
`));
        console.log(`${gradient(["#ff99ff", "#ff00ff"])("[ owner ]: ")} ${gradient("cyan", "pink")("HUSSEIN YACOUBI")}`);
        console.log(`${gradient(["#ff99ff", "#ff00ff"])("[ Facebook ]: ")} ${gradient("cyan", "pink")("https://www.facebook.com/share/15EQBXgrmV/")}`);
        const { data } = await axios.get("https://raw.githubusercontent.com/Tshukie/Kaguya-Pr0ject/master/package.json");
        if (semver.lt(this.package.version, (data.version ??= this.package.version))) {
            log([{ message: "[ SYSTEM ]: ", color: "yellow" }, { message: `New Update: contact the owner`, color: "white" }]);
        }
        this.emit("system:run");
    } catch (err) {
        this.emit("system:error", err);
    }
  }

  async loadComponents() {
    let failedCount = 0;
    try {
      await commandMiddleware();
      console.log(`✔ Loaded ${global.client.commands.size} commands.`);
    } catch (err) {
      failedCount++;
      console.error(`❌ Failed to load commands: ${err.message}`);
    }
    try {
      await eventMiddleware();
      console.log(`✔ Loaded ${global.client.events.size} events.`);
    } catch (err) {
      failedCount++;
      console.error(`❌ Failed to load events: ${err.message}`);
    }
    console.log("=".repeat(50));
    console.log(`✔ Total commands loaded: ${global.client.commands.size}`);
    console.log(`✔ Total events loaded: ${global.client.events.size}`);
    if (failedCount > 0) {
      console.log(`❌ Failed to load ${failedCount} component(s).`);
    } else {
      console.log("✔ All components loaded successfully!");
    }
    console.log("=".repeat(50));
  }

  start() {
    setInterval(() => {
      const t = process.uptime();
      const [i, a, m] = [Math.floor(t / 3600), Math.floor((t % 3600) / 60), Math.floor(t % 60)].map((num) => (num < 10 ? "0" + num : num));
      const formatMemoryUsage = (data) => `${Math.round((data / 1024 / 1024) * 100) / 100} MB`;
      const memoryData = process.memoryUsage();
      process.title = `Kaguya Project - Author: Arjhil Dacayanan - ${i}:${a}:${m} - External: ${formatMemoryUsage(memoryData.external)}`;
    }, 1000);

    (async () => {
      global.client = {
        commands: new Map(),
        events: new Map(),
        cooldowns: new Map(),
        aliases: new Map(),
        handler: {
          reply: new Map(),
          reactions: new Map(),
        },
        config: this.currentConfig,
        devMessages: new Map(),
      };

      await this.loadComponents();
      this.checkVersion();

      this.on("system:run", () => {
        login({ appState: JSON.parse(this.credentials) }, async (err, api) => {
          if (err) this.emit("system:error", err);

          api.setOptions(this.currentConfig.options);

          // ←←← هنا تضع الكود المضاف الخاص برسالة إعادة التشغيل
          if (fs.existsSync("restart_info.json")) {
            const data = JSON.parse(fs.readFileSync("restart_info.json", "utf-8"));
            api.sendMessage("✅ تمت إعادة التشغيل بنجاح!", data.threadID);
            fs.unlinkSync("restart_info.json");
          }
          // ←←← نهاية الإضافة

          const listenMqtt = async () => {
            try {
              if (!listenMqtt.isListening) {
                listenMqtt.isListening = true;
                const mqtt = await api.listenMqtt(async (err, event) => {
                  if (err) this.on("error", err);
                  await listen({ api, event, client: global.client });
                });
                await sleep(this.currentConfig.mqtt_refresh);
                notifer("[ MQTT ]", "Mqtt refresh in progress!");
                log([{ message: "[ MQTT ]: ", color: "yellow" }, { message: `Refresh mqtt in progress!`, color: "white" }]);
                await mqtt.stopListening();
                await sleep(5000);
                notifer("[ MQTT ]", "Refresh successful!");
                log([{ message: "[ MQTT ]: ", color: "green" }, { message: `Refresh successful!`, color: "white" }]);
                listenMqtt.isListening = false;
              }
              listenMqtt();
            } catch (error) {
              this.emit("system:error", error);
            }
          };

          listenMqtt.isListening = false;
          listenMqtt();
        });
      });
    })();
  }
}

const KaguyaInstance = new Kaguya();
KaguyaInstance.start();
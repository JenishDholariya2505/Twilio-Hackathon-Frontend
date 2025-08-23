// src/twilioClient.js
import { Device } from "@twilio/voice-sdk";

let deviceSingleton = null;

export async function getDevice({ onStatus, onIncoming, onLog } = {}) {
  if (deviceSingleton) return deviceSingleton;

  const log = (...a) => {
    console.log("[Twilio]", ...a);
    onLog && onLog(a.join(" "));
  };
  const set = (s) => onStatus && onStatus(s);

  async function fetchToken() {
    try {
      const r = await fetch(
        "https://twilio-hackathon-backend.vercel.app/token"
      );
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(`Token HTTP ${r.status}: ${errorText}`);
      }
      const j = await r.json();
      if (!j?.token) throw new Error("No token in response");
      return j.token;
    } catch (error) {
      log(`Token fetch failed: ${error.message}`);
      throw error;
    }
  }

  try {
    const token = await fetchToken();

    const d = new Device(token, {
      logLevel: 1,
      codecPreferences: ["opus", "pcmu"],
      // edge: 'ashburn', // uncomment if your network is picky
      closeProtection: true, // Prevents accidental disconnection
      fakeLocalDTMF: true, // Better DTMF support
    });

    d.on("ready", () => {
      log("Device ready");
      set("Ready");
    });

    d.on("registered", () => {
      log("Device registered");
      set("Ready");
    });

    d.on("unregistered", () => {
      log("Device unregistered");
      set("Connecting…");
    });

    d.on("error", (e) => {
      console.error("Device error:", e);
      const errorMsg = `Error ${e.code || ""} ${e.message || e}`;
      set(errorMsg);
      onLog && onLog(errorMsg);

      // Handle specific errors
      if (e.code === 31005) {
        log("Gateway error detected - this is usually temporary");
      } else if (e.code === 31000) {
        log("Invalid access token - check your Twilio credentials");
      }
    });

    d.on("incoming", (call) => {
      log(`Incoming call from: ${call.parameters.From}`);
      onIncoming && onIncoming(call);
    });

    d.on("tokenWillExpire", async () => {
      log("Token will expire → refreshing");
      try {
        const newToken = await fetchToken();
        d.updateToken(newToken);
        log("Token refreshed successfully");
      } catch (e) {
        const errorMsg = "Error: token refresh failed";
        set(errorMsg);
        log(errorMsg);
      }
    });

    d.on("tokenExpired", () => {
      log("Token expired - attempting to refresh");
      // The SDK will automatically try to refresh, but we can help
      fetchToken()
        .then((newToken) => {
          d.updateToken(newToken);
        })
        .catch((e) => {
          log(`Token refresh failed: ${e.message}`);
        });
    });

    await d.register(); // <-- important (some envs don't auto-register)
    deviceSingleton = d;
    return d;
  } catch (error) {
    log(`Device initialization failed: ${error.message}`);
    throw error;
  }
}

export function destroyDevice() {
  try {
    if (deviceSingleton) {
      deviceSingleton.destroy();
      console.log("Device destroyed");
    }
  } catch (error) {
    console.error("Error destroying device:", error);
  }
  deviceSingleton = null;
}

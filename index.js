const { onValueCreated, onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();  
const rtdb = admin.database();

const emailToKey = (email) => String(email).replace(/\./g, ",");  
///////////////////////////////////
function getCurrentHourInTZ(tz = "Asia/Ho_Chi_Minh") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

function isInHourRange(nowHour, startHour, endHour) {
  if (
    typeof startHour !== "number" ||
    typeof endHour !== "number" ||
    startHour < 0 || startHour > 23 ||
    endHour < 0 || endHour > 23
  ) return false;

  if (startHour === endHour) return true;         // coi như cả ngày
  if (startHour < endHour) return nowHour >= startHour && nowHour < endHour;
  return nowHour >= startHour || nowHour < endHour; // qua đêm 22 -> 8
}
////////////////////////////////////


async function findOwnerEmail(log) {
  const deviceId = log.device_id;
  const deviceName = log.device_name;

  if (deviceId) {
    const direct = await rtdb.ref(`devices/${deviceId}/owner`).get();
    if (direct.exists()) return direct.val();

    const q = await rtdb
      .ref("devices")
      .orderByChild("device_id")
      .equalTo(deviceId)
      .limitToFirst(1)
      .get();

    if (q.exists()) {
      const obj = q.val();
      const firstKey = Object.keys(obj)[0];
      return obj[firstKey]?.owner || null;
    }
  }

  if (deviceName) {
    const byName = await rtdb.ref(`devices/${deviceName}/owner`).get();
    if (byName.exists()) return byName.val();

    const q2 = await rtdb
      .ref("devices")
      .orderByChild("device_name")
      .equalTo(deviceName)
      .limitToFirst(1)
      .get();

    if (q2.exists()) {
      const obj2 = q2.val();
      const firstKey2 = Object.keys(obj2)[0];
      return obj2[firstKey2]?.owner || null;
    }
  }

  return null;
}

async function readDeviceState(deviceId) {
  const snap = await rtdb.ref(`devices/${deviceId}`).get();
  if (!snap.exists()) return null;
  const data = snap.val() || {};
  return {
    shutdown: !!data.shutdown,
    start_hour: data?.config?.start_hour,
    end_hour: data?.config?.end_hour,
    timezone: data.timezone || "Asia/Ho_Chi_Minh",
  };
}

async function setAlarmActiveIfNeeded(desired) {
  const alarmActiveRef = rtdb.ref("system_status/alarm_active");
  const curSnap = await alarmActiveRef.get();
  const cur = curSnap.exists() ? curSnap.val() : undefined;
  if (cur !== desired) await alarmActiveRef.set(desired);
}




exports.onLogCreated = onValueCreated("/logs/{logId}", async (event) => {
  const logId = event.params.logId;
  const log = event.data?.val();
  if (!log) return;

  const ownerEmail = await findOwnerEmail(log);
  if (!ownerEmail) return;

  const emailKey = emailToKey(ownerEmail);

  const imageName =
    log.image_name ||
    (typeof log.image_url === "string" ? log.image_url.split("/").pop() : null) ||
    null;

  const message = log.message || (log.detected ? "Detected" : "Log");

  const timestamp =
    typeof log.timestamp === "number"
      ? log.timestamp
      : admin.database.ServerValue.TIMESTAMP;

  // ghi đè 1 bản ghi gần nhất
  await rtdb.ref(`detected/${emailKey}`).set({
    email: ownerEmail,
    image_name: imageName,
    message,
    timestamp,
    device_id: log.device_id || null,
    image_url: log.image_url || null,

    // trace log nào đã ghi đè
    last_log_id: logId,
  });
});

exports.onShutdownChanged = onValueWritten("/devices/{deviceId}/shutdown", async (event) => {
  const before = event.data?.before?.val();
  const after = event.data?.after?.val();

  // chỉ chạy khi thực sự đổi
  if (before === after) return;

  const deviceId = event.params.deviceId;
  const state = await readDeviceState(deviceId);
  if (!state) return;

  if (state.shutdown) {
    await setAlarmActiveIfNeeded(true);
    return;
  }

  // shutdown=false => cần start/end
  const start = state.start_hour;
  const end = state.end_hour;
  if (typeof start !== "number" || typeof end !== "number") return;

  const nowHour = getCurrentHourInTZ(state.timezone);
  const inRange = isInHourRange(nowHour, start, end);
  const desiredActive = !inRange;

  await setAlarmActiveIfNeeded(desiredActive);
});

/**
 * 2) Xử lý thay đổi start_hour / end_hour
 * - nếu shutdown=true => alarm_active=true
 * - nếu shutdown=false => alarm_active theo start/end
 */
exports.onConfigHourChanged = onValueWritten(
  "/devices/{deviceId}/config/{field}",
  async (event) => {
    const field = event.params.field;
    if (field !== "start_hour" && field !== "end_hour") return;

    const before = event.data?.before?.val();
    const after = event.data?.after?.val();
    if (before === after) return; // chỉ chạy khi đổi

    const deviceId = event.params.deviceId;
    const state = await readDeviceState(deviceId);
    if (!state) return;

    if (state.shutdown) {
      await setAlarmActiveIfNeeded(false);
      return;
    }

    const start = state.start_hour;
    const end = state.end_hour;
    if (typeof start !== "number" || typeof end !== "number") return;

    const nowHour = getCurrentHourInTZ(state.timezone);
    const inRange = isInHourRange(nowHour, start, end);

    await setAlarmActiveIfNeeded(inRange);
  }
);



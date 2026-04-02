import IORedis from "ioredis";
import type { NotificationSocketServer } from "./socket";
import type { NotificationPayload } from "./types";
import { saveNotification } from "./services/notification.service";

export const NOTIFICATION_CHANNEL = "notification:send";

// ─────────────────────────────────────────────────────────────────────────────
// Redis Subscriber 초기화
// ─────────────────────────────────────────────────────────────────────────────

export function createRedisSubscriber(io: NotificationSocketServer) {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";

  const subscriber = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  subscriber.on("connect", () => {
    console.log("[Redis] Subscriber connected");
  });

  subscriber.on("error", (err) => {
    console.error("[Redis] Subscriber error", err);
  });

  subscriber.subscribe(NOTIFICATION_CHANNEL, (err) => {
    if (err) {
      console.error(`[Redis] Failed to subscribe to ${NOTIFICATION_CHANNEL}`, err);
      return;
    }
    console.log(`[Redis] Subscribed to channel: ${NOTIFICATION_CHANNEL}`);
  });

  // ── 메시지 수신 → DB 저장 → 소켓 전송 ──────────────────────────────────
  subscriber.on("message", async (channel, rawMessage) => {
    if (channel !== NOTIFICATION_CHANNEL) return;

    let payload: NotificationPayload;
    try {
      payload = JSON.parse(rawMessage) as NotificationPayload;
    } catch {
      console.error("[Redis] Invalid notification message format", rawMessage);
      return;
    }

    try {
      const notification = await saveNotification(payload);

      // 해당 유저의 룸에 실시간 전송
      io.to(`user:${payload.userId}`).emit("notification:new", notification);

      console.log(
        `[Notification] Sent to userId=${payload.userId} type=${payload.type}`,
      );
    } catch (err) {
      console.error("[Notification] Failed to process notification", err);
    }
  });

  return subscriber;
}

import { messagingApi } from "@line/bot-sdk";

if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  console.warn("⚠️ Warning: LINE_CHANNEL_ACCESS_TOKEN is not defined in environment variables");
}

/**
 * LINE Messaging API Client instance
 */
export const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
});


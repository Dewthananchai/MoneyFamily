#!/usr/bin/env node
/**
 * ตรวจการเชื่อมต่อ LINE ทั้งระบบด้วยคำสั่งเดียว
 *
 *   npm run check:line
 *   npm run check:line -- --url https://your-domain.vercel.app
 *
 * ตรวจ: bot credentials, webhook config, LINE webhook test (signature จริงจาก LINE),
 *       signature ที่เราคำนวณเอง, LIFF URL ปลายทาง — ไม่พิมพ์ค่า secret ออกมา
 */

import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { parseEnvFile } from "./lib/env-file.mjs";

const argv = process.argv.slice(2);
function argValue(name, fallback) {
  const withEq = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.slice(name.length + 3);
  const idx = argv.indexOf(`--${name}`);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith("--")) return argv[idx + 1];
  return fallback;
}

const env = parseEnvFile(readFileSync(".env.local", "utf8"));
const token = env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
const secret = env.get("LINE_CHANNEL_SECRET") || "";
const liffId = env.get("NEXT_PUBLIC_LIFF_ID") || "";
const appUrl = argValue("url", env.get("NEXT_PUBLIC_APP_URL") || "").replace(/\/+$/, "");

if (!token) {
  console.error("❌ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env.local");
  process.exit(1);
}

const auth = { Authorization: `Bearer ${token}`, "content-type": "application/json" };
const icon = (ok) => (ok ? "✅" : "❌");
let failed = 0;

async function botInfo() {
  const res = await fetch("https://api.line.me/v2/bot/info", { headers: auth });
  if (!res.ok) {
    failed++;
    console.log(`${icon(false)} bot credentials: ${res.status} ${(await res.text()).slice(0, 100)}`);
    return;
  }
  const b = await res.json();
  console.log(`${icon(true)} bot: ${b.displayName} (${b.basicId})`);
}

async function webhookConfig() {
  const res = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", { headers: auth });
  const cfg = await res.json();
  const expected = `${appUrl}/api/webhook`;
  const ok = cfg.endpoint === expected && cfg.active === true;
  if (!ok) failed++;
  console.log(`${icon(ok)} webhook: ${cfg.endpoint} (active: ${cfg.active})`);
  if (!ok) console.log(`   → ควรเป็น ${expected}`);
}

async function lineWebhookTest() {
  const endpoint = `${appUrl}/api/webhook`;
  const res = await fetch("https://api.line.me/v2/bot/channel/webhook/test", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ endpoint }),
  });
  const result = await res.json();
  const ok = result.success === true;
  if (!ok) failed++;
  console.log(
    `${icon(ok)} LINE webhook test: success=${result.success}${
      ok ? "" : ` statusCode=${result.statusCode} reason=${result.reason}`
    }`
  );
  if (!ok) console.log("   → signature จาก LINE ไม่ผ่าน: LINE_CHANNEL_SECRET ไม่ตรงกับ channel");
}

async function selfSignature() {
  if (!secret) {
    console.log("❌ ไม่พบ LINE_CHANNEL_SECRET");
    failed++;
    return;
  }
  const body = JSON.stringify({ events: [] });
  const sig = createHmac("sha256", secret).update(body).digest("base64");
  const res = await fetch(`${appUrl}/api/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-line-signature": sig },
    body,
  });
  const ok = res.status === 200;
  if (!ok) failed++;
  console.log(`${icon(ok)} webhook รับ signature จาก secret ใน .env.local: HTTP ${res.status}`);
  if (!ok) console.log("   → secret ที่ deploy ยังไม่ตรงกับไฟล์: push env + redeploy ก่อน");
}

async function webhookGuards() {
  const noSig = await fetch(`${appUrl}/api/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const badSig = await fetch(`${appUrl}/api/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-line-signature": "bad" },
    body: "{}",
  });
  const ok = noSig.status === 401 && badSig.status === 403;
  if (!ok) failed++;
  console.log(
    `${icon(ok)} guard: ไม่มี signature=${noSig.status} (ต้อง 401), signature ผิด=${badSig.status} (ต้อง 403)`
  );
}

async function liffEndpoint() {
  if (!liffId) return;
  const res = await fetch(`https://liff.line.me/${liffId}`);
  const html = await res.text();
  const match = html.match(/https:\/\/[a-z0-9.-]+\.vercel\.app[^"' <]*/i);
  const target = match ? match[0] : "(ไม่พบ)";
  const ok = target.replace(/\/+$/, "") === appUrl;
  if (!ok) failed++;
  console.log(`${icon(ok)} LIFF endpoint ใน console: ${target}`);
  if (!ok) console.log(`   → ต้องแก้ Endpoint URL ใน LINE Developers Console เป็น ${appUrl}`);
}

console.log(`\n🔍 ตรวจ LINE integration (${appUrl})\n`);
await botInfo();
await webhookConfig();
await lineWebhookTest();
await selfSignature();
await webhookGuards();
await liffEndpoint();

console.log(failed ? `\nผลรวม: พบปัญหา ${failed} จุด ❌\n` : "\nผลรวม: LINE พร้อมใช้งาน ✅\n");
process.exit(failed ? 1 : 0);

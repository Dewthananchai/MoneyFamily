#!/usr/bin/env node
/**
 * เฝ้าไฟล์ .line-secret-candidate แล้วทำงานทั้งชุดให้ทันทีที่ไฟล์ถูกสร้าง:
 *   1) ตรวจว่า secret ตรงกับ Messaging API channel ของ bot จริง
 *   2) เขียนลง .env.local
 *   3) อัปเดต Vercel (Production) + redeploy
 *   4) รัน npm run check:line ยืนยันผล
 *
 *   node scripts/apply-line-secret.mjs            # เฝ้า 10 นาที
 *   node scripts/apply-line-secret.mjs --timeout 1800
 *
 * ไม่พิมพ์ค่า secret ออกมาไม่ว่ากรณีใด (log อยู่ที่ .line-apply.log)
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { parseEnvFile } from "./lib/env-file.mjs";

const CANDIDATE = ".line-secret-candidate";
const LOG = ".line-apply.log";
const argv = process.argv.slice(2);
const tIdx = argv.indexOf("--timeout");
const timeoutSec = tIdx !== -1 ? Number(argv[tIdx + 1]) || 600 : 600;

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(msg);
  appendFileSync(LOG, `${line}\n`);
};
const sha = (v) => createHash("sha256").update(v).digest("hex").slice(0, 12);

function readEnvFile() {
  return parseEnvFile(readFileSync(".env.local", "utf8"));
}

function normalize(raw) {
  return raw
    .replace(/^\uFEFF/, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .join("")
    .replace(/^LINE_CHANNEL_SECRET=/, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

async function botChannelId(token) {
  const res = await fetch("https://api.line.me/v2/oauth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ access_token: token }),
  });
  if (!res.ok) return "";
  return (await res.json()).client_id || "";
}

async function secretMatches(secret, channelId) {
  const res = await fetch("https://api.line.me/v2/oauth/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: channelId,
      client_secret: secret,
    }),
  });
  return res.ok;
}

async function waitForCandidate() {
  const deadline = Date.now() + timeoutSec * 1000;
  log(`👀 เฝ้าไฟล์ ${CANDIDATE} (สูงสุด ${Math.round(timeoutSec / 60)} นาที)`);
  while (Date.now() < deadline) {
    if (existsSync(CANDIDATE)) {
      const value = normalize(readFileSync(CANDIDATE, "utf8"));
      if (value.length >= 16) return value;
      log(`⏳ พบไฟล์แล้วแต่ค่ายาว ${value.length} ตัว — รอค่าที่สมบูรณ์ (ปกติ 32 ตัว)`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return "";
}

const secret = await waitForCandidate();
if (!secret) {
  log("⌛ หมดเวลา — ยังไม่พบค่าใหม่ จึงยังไม่มีการเปลี่ยนแปลงใด ๆ");
  process.exit(1);
}

const env = readEnvFile();
const token = env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
log(`📥 พบค่าใหม่: len=${secret.length} sha=${sha(secret)}`);

const channelId = await botChannelId(token);
if (!channelId) {
  log("❌ อ่าน channel ID ของ bot ไม่ได้ — ยกเลิก");
  process.exit(1);
}

if (!(await secretMatches(secret, channelId))) {
  log(`❌ secret นี้ไม่ตรงกับ Messaging API channel ${channelId} — ยังไม่เขียนอะไรลงไฟล์`);
  log(`   → เปิด https://developers.line.biz/console/channel/${channelId}/basics`);
  process.exit(1);
}
log(`✅ secret ตรงกับ Messaging API channel ${channelId}`);

// ถ้าตรงกับ channel ของ bot แล้ว ให้ลองเทียบว่าเป็นของ LINE Login channel หรือไม่ (เพื่ออธิบายให้ชัด)
const text = readFileSync(".env.local", "utf8");
writeFileSync(
  ".env.local",
  /^LINE_CHANNEL_SECRET=.*$/m.test(text)
    ? text.replace(/^LINE_CHANNEL_SECRET=.*$/m, `LINE_CHANNEL_SECRET=${secret}`)
    : `${text.replace(/\s*$/, "")}\nLINE_CHANNEL_SECRET=${secret}\n`
);
log("✅ เขียนลง .env.local แล้ว");

const run = (cmd, args, input) =>
  spawnSync(cmd, args, { input, encoding: "utf8", stdio: input === undefined ? "pipe" : ["pipe", "pipe", "pipe"] });

log("☁️  อัปเดต Vercel Production …");
run("vercel", ["env", "rm", "LINE_CHANNEL_SECRET", "production", "--yes"]);
const add = run("vercel", ["env", "add", "LINE_CHANNEL_SECRET", "production"], `${secret}\n`);
if (add.status !== 0) {
  log(`⚠️  vercel env add ล้มเหลว (exit ${add.status}) — ตั้งค่าผ่าน Dashboard แทน`);
  log(`   ${(add.stderr || "").split("\n").filter((l) => l && !l.includes(secret)).slice(0, 3).join(" | ")}`);
}
log("🚀 Deploy production …");
const deploy = run("vercel", ["--prod", "--yes", "--no-color"]);
if (deploy.status !== 0) {
  log(`❌ deploy ล้มเหลว (exit ${deploy.status})`);
  process.exit(1);
}
log("✅ deploy สำเร็จ");

log("🔍 ตรวจซ้ำด้วย check:line …");
const check = run("npm", ["run", "check:line"]);
const out = (check.stdout || "").split("\n").filter((l) => l.trim() && !l.includes(secret));
log(out.slice(-14).join("\n"));

if (check.status === 0) {
  log("🎉 LINE พร้อมใช้งาน — ลบค่าในไฟล์ชั่วคราวแล้ว");
  try {
    unlinkSync(CANDIDATE);
  } catch {}
} else {
  log("⚠️  ยังมีจุดที่ไม่ผ่าน — ดูรายละเอียดด้านบน (ไฟล์ชั่วคราวยังอยู่)");
}

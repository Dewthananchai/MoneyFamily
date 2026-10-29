#!/usr/bin/env node
/**
 * ดัน Environment Variables จาก .env.local ขึ้น Vercel
 *
 *   npm run push:env                                  # production + preview
 *   npm run push:env -- --targets production          # เฉพาะ production
 *   npm run push:env -- --only OPENAI_API_KEY,CRON_SECRET
 *   npm run push:env -- --dry-run                     # ดูแผนก่อน ไม่แตะ Vercel
 *
 * ความปลอดภัย:
 * - ค่า secret ถูกส่งเข้า CLI ทาง stdin เท่านั้น (ไม่ผ่าน argv ซึ่งโชว์ใน process list)
 * - ไม่พิมพ์ค่าใด ๆ ออกมา และ redact ค่าออกจาก output ของ CLI ก่อนแสดง
 * - ตั้งค่าเป็น "sensitive" อัตโนมัติสำหรับตัวแปรที่ขึ้นต้นด้วย NEXT_PUBLIC_ ไม่ใช่
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseEnvFile, PLACEHOLDER } from "./lib/env-file.mjs";

// ---------- parse argv ----------
const argv = process.argv.slice(2);
function argValue(name, fallback) {
  const withEq = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.slice(name.length + 3);
  const idx = argv.indexOf(`--${name}`);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith("--")) return argv[idx + 1];
  return fallback;
}
const hasFlag = (name) => argv.includes(`--${name}`);

const file = argValue("file", ".env.local");
const dryRun = hasFlag("dry-run");
const skipCheck = hasFlag("skip-check");
const targets = argValue("targets", "production,preview")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const only = argValue("only", "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

const VALID_TARGETS = ["production", "preview", "development"];
const path = resolve(process.cwd(), file);

if (!existsSync(path)) {
  console.error(`❌ ไม่พบไฟล์ ${file}`);
  process.exit(1);
}
const badTargets = targets.filter((t) => !VALID_TARGETS.includes(t));
if (badTargets.length) {
  console.error(`❌ target ไม่ถูกต้อง: ${badTargets.join(", ")} (ใช้ได้: ${VALID_TARGETS.join(", ")})`);
  process.exit(1);
}

const env = parseEnvFile(readFileSync(path, "utf8"));
let entries = [...env.entries()].filter(([, v]) => v !== "");
if (only.length) entries = entries.filter(([k]) => only.includes(k));

const missingFromFile = only.filter((k) => !env.has(k));
if (missingFromFile.length) {
  console.error(`❌ ไม่พบตัวแปรใน ${file}: ${missingFromFile.join(", ")}`);
  process.exit(1);
}

const placeholders = entries.filter(([, v]) => PLACEHOLDER.test(v)).map(([k]) => k);
const invalid = entries.filter(([, v]) => v.includes("\n") || v.includes("\r")).map(([k]) => k);
if (placeholders.length || invalid.length) {
  if (placeholders.length) console.error(`❌ ยังเป็น placeholder: ${placeholders.join(", ")}`);
  if (invalid.length) console.error(`❌ มีบรรทัดใหม่ในค่า: ${invalid.join(", ")}`);
  process.exit(1);
}

/** ตัวแปรที่ไม่ขึ้นต้น NEXT_PUBLIC_ ถือเป็นความลับ -> เก็บแบบ sensitive (อ่านกลับไม่ได้) */
const isSensitive = (key) => !key.startsWith("NEXT_PUBLIC_");

/** ลบค่า secret ออกจากข้อความก่อนแสดงผล */
function redact(text, value) {
  if (!text) return "";
  if (value.length < 8) return text;
  return text.split(value).join("***REDACTED***");
}

function runVercel(args, { input } = {}) {
  return spawnSync("vercel", args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });
}

// ---------- ตรวจ env ก่อน (ใช้ตัวตรวจเดิม ไม่เขียนซ้ำ) ----------
if (!skipCheck) {
  const check = spawnSync(process.execPath, ["scripts/check-env.mjs", file], {
    stdio: "inherit",
  });
  if (check.status !== 0) {
    console.error("\n❌ ตัวตรวจ env ไม่ผ่าน — แก้ให้เรียบร้อยก่อน หรือใช้ --skip-check เพื่อข้าม");
    process.exit(1);
  }
}

const plan = [];
for (const target of targets) {
  for (const [key] of entries) plan.push({ key, target, sensitive: isSensitive(key) });
}

console.log(`\n📤 วางแผนอัปโหลด ${entries.length} ตัวแปร → Vercel (${targets.join(", ")})\n`);
for (const key of entries.map(([k]) => k)) {
  console.log(
    `   ${key.padEnd(34)} ${isSensitive(key) ? "sensitive" : "config   "}  → ${targets.join(", ")}`
  );
}

if (dryRun) {
  console.log(`\n--dry-run: ยังไม่ได้ส่งอะไรขึ้น Vercel (รวม ${plan.length} รายการ)\n`);
  process.exit(0);
}

// ---------- ตรวจ login / project link ----------
const whoami = runVercel(["whoami", "--no-color"]);
const account = (whoami.stdout || "").trim().split("\n").pop() || "";
if (whoami.status !== 0 || /logged out|not logged in/i.test(whoami.stdout + whoami.stderr)) {
  console.error("\n❌ ยังไม่ได้ login Vercel — รัน `vercel login` ก่อนแล้วรันสคริปต์นี้อีกครั้ง");
  process.exit(1);
}
console.log(`\n👤 Vercel account: ${account}`);

if (!existsSync(resolve(process.cwd(), ".vercel/project.json"))) {
  console.error("❌ โปรเจกต์นี้ยังไม่ได้ link กับ Vercel — รัน `vercel link` ก่อน");
  process.exit(1);
}

// ---------- อัปโหลด ----------
const failures = [];
let done = 0;

for (const target of targets) {
  for (const [key, value] of entries) {
    const args = ["env", "add", key, target, "--force", "--non-interactive", "--no-color"];
    if (isSensitive(key)) args.push("--sensitive");

    const res = runVercel(args, { input: value });
    const output = redact(`${res.stdout || ""}${res.stderr || ""}`, value);

    if (res.status === 0) {
      done++;
      console.log(`✅ ${key} → ${target}`);
    } else {
      failures.push({ key, target });
      console.log(`❌ ${key} → ${target}`);
      const detail = output
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !/^(Vercel CLI|>)/.test(l))
        .slice(0, 3)
        .join(" | ");
      if (detail) console.log(`   ${detail}`);
    }
  }
}

console.log(
  `\nผลรวม: สำเร็จ ${done}/${plan.length}${failures.length ? `, ล้มเหลว ${failures.length}` : ""}`
);

if (failures.length) {
  console.log("\nรายการที่ล้มเหลว (ลองรันใหม่เฉพาะตัวนี้ด้วย --only):");
  for (const f of failures) console.log(`   - ${f.key} → ${f.target}`);
  console.log("\nหรือเพิ่มทีละตัวด้วยมือ: vercel env add <KEY> <target> --force --sensitive\n");
  process.exit(1);
}

console.log(
  "\n⚠️  Environment Variables มีผลกับ deployment ครั้งถัดไป — ต้อง Redeploy:\n" +
    "   vercel --prod        (หรือกด Redeploy ใน Vercel Dashboard)\n"
);

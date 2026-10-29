# 👨‍👩‍👧‍👦 MoneyFamily (แอปจัดการเงินครอบครัวบน LINE + PWA)

แอปพลิเคชันจัดการการเงินและหารค่าใช้จ่ายในครอบครัว เชื่อมต่อการใช้งานผ่าน **LINE Messaging API**, **LINE LIFF** และ **PWA (Progressive Web App)** พัฒนาด้วย Next.js (App Router), Supabase PostgreSQL, OpenAI (Structured Outputs & Vision OCR)

---

## ✨ ฟีเจอร์หลัก (Key Features)

1. **จดบันทึกรายรับ-รายจ่ายผ่าน LINE แชท:**
   - พิมพ์ข้อความภาษาไทยธรรมดา เช่น *"กาแฟ 60 ด้วย SCB"* หรือ *"ข้าวเที่ยง 80"* ระบบใช้ OpenAI Structured Outputs สกัดเป็นข้อมูลบันทึกลงระบบทันที
2. **สแกนสลิปโอนเงินอัตโนมัติ (Slip OCR - Process & Purge):**
   - ส่งรูปสลิปในแชท ระบบดึงข้อมูลยอดเงิน ร้านค้า วันที่ ในหน่วยความจำ (RAM Buffer) และล้างข้อมูลรูปภาพทิ้งทันทีโดยไม่เปลือง Storage
3. **ระบบหารบิลกับคนในบ้าน (Split Bill Interactive Screen):**
   - แตะปุ่ม *"หารกับคนในบ้าน"* เพื่อเลือกสมาชิก (Checkbox), โหมด 50/50, หรือปรับเปอร์เซ็นต์สัดส่วน
4. **สรุปหนี้สินและ PromptPay QR Code:**
   - พิมพ์ *"สรุปหนี้"* บอทจะคำนวณหักลบกลบลบหนี้ (Debt Netting) และสร้างรูปภาพ PromptPay QR Code ให้สแกนโอนเงินคืนกันได้ทันที
5. **แจ้งเตือนบิลประจำรอบ (Recurring Bills & Vercel Cron):**
   - พิมพ์ *"Netflix 419 ทุกเดือน"* ระบบจะตั้งรอบบิล และ Cron Job จะส่ง Push Notification เตือนในวันครบกำหนด (Due Date)
6. **Dashboard และ PWA:**
   - รองรับการติดตั้งแบบ PWA บนหน้าจอมือถือ (iOS/Android)
   - Auto-login ด้วย LINE LIFF SDK
   - แสดงสถิติกราฟกระแสเงินสดด้วย Recharts และตารางเดินบัญชี

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS (CI: Navy `#0F2038` & Amber/Orange `#F59E0B`)
- **Database & Auth:** Supabase PostgreSQL, Row Level Security (RLS)
- **AI & OCR:** OpenAI API (GPT-4o-mini & Vision)
- **LINE Platform:** LINE Messaging API (`@line/bot-sdk`), LINE LIFF SDK (`@line/liff`)
- **Payment & QR:** `promptpay-qr`, `qrcode`
- **Charts:** `recharts`
- **Deployment:** Vercel (Cron Jobs & Serverless Route Handlers)

---

## 🚀 เริ่มต้นใช้งาน (Local Development)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
คัดลอก `.env.example` ไปเป็น `.env.local` แล้วใส่ API Keys:
```bash
cp .env.example .env.local
```

### 3. ตรวจ Environment Variables
```bash
npm run check:env                       # ตรวจ .env.local
npm run check:env -- .env.production    # ตรวจไฟล์อื่น
```
ตรวจความครบ, รูปแบบคีย์ (Supabase publishable/secret, LINE, LIFF, OpenAI), การสลับคีย์ผิดตำแหน่ง
และความสอดคล้องของ `NEXT_PUBLIC_APP_URL` กับ LIFF — **ไม่พิมพ์ค่า secret ออกมา** และ exit code 1 เมื่อไม่พร้อม deploy

### 4. ดัน Environment Variables ขึ้น Vercel
```bash
vercel login && vercel link      # ทำครั้งแรก
npm run push:env                 # production + preview
npm run push:env -- --targets production
npm run push:env -- --only OPENAI_API_KEY,CRON_SECRET
npm run push:env -- --dry-run    # ดูแผนก่อน ไม่แตะ Vercel
```
ส่งค่าเข้า CLI ทาง stdin (ไม่ผ่าน argv), ไม่พิมพ์ค่า secret, ตั้ง `--sensitive` ให้ตัวแปรที่ไม่ใช่ `NEXT_PUBLIC_`
อัตโนมัติ และ redact ค่าออกจาก output แม้กรณี error — หลังรันต้อง Redeploy เพื่อให้ค่ามีผล

### 5. รัน Development Server
```bash
npm run dev
```
เปิด [http://localhost:3000](http://localhost:3000) บนเบราว์เซอร์

---

## 📱 ตั้งค่า LINE LIFF

แอปนี้ใช้ LIFF เป็นทางเข้า Dashboard และเป็นปลายทางของลิงก์ลงทะเบียนที่ LINE Bot ส่งให้ผู้ใช้ใหม่

- **LIFF ID:** `2012284598-NotCayv0`
- **ลิงก์เปิดแอป:** https://liff.line.me/2012284598-NotCayv0
- **Endpoint URL:** `NEXT_PUBLIC_APP_URL` ของคุณ (ต้องเป็น **https** และตรงกับโดเมนที่ deploy เช่น `https://<ชื่อโปรเจกต์>.vercel.app`)

### ค่าที่ต้องตั้งใน LINE Developers Console → LIFF

| หัวข้อ | ค่า |
| --- | --- |
| Endpoint URL | `https://<โดเมนที่ deploy จริง>` (ไม่มี `/` ต่อท้าย) |
| Size | `Full` (หน้าจอเต็มสำหรับ Dashboard) |
| Scope | `profile`, `openid` (เพิ่ม `chat_message.write` เฉพาะกรณีต้องส่งข้อความจาก LIFF) |
| Scan QR | `On-demand` |
| Module mode | ปิด |

### Environment Variables ที่เกี่ยวข้อง

```bash
NEXT_PUBLIC_LIFF_ID=2012284598-NotCayv0
NEXT_PUBLIC_APP_URL=https://<โดเมนที่ deploy จริง>
```

> ⚠️ LIFF ต้องเปิดผ่าน **https** เท่านั้น จึงทดสอบ login จริงบน `localhost` ไม่ได้ (หน้าเว็บจะแสดงสถานะไม่พร้อมใช้งาน)
> ให้ deploy ขึ้น Vercel แล้วตั้ง Endpoint URL ให้ตรงกับโดเมนนั้นก่อนทดสอบ

### พฤติกรรมการทำงาน

1. เปิดจากแชท LINE (`liff.line.me/...`) → ระบบ auto-login ด้วยบัญชี LINE ที่เปิดอยู่ และดึงโปรไฟล์มาแสดง
2. เปิดในเบราว์เซอร์ปกติ → แสดงปุ่ม “เข้าสู่ระบบด้วย LINE” / “เปิดใน LINE”
3. ถ้า Endpoint URL หรือ LIFF ID ไม่ถูกต้อง → แสดงแบนเนอร์แจ้งข้อผิดพลาดพร้อมวิธีแก้
4. ปุ่มปิดหน้าต่าง (X) จะแสดงเฉพาะเมื่อเปิดอยู่ใน LINE เพื่อกลับไปที่แชท

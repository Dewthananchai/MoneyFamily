import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoneyFamily - จัดการเงินครอบครัว",
    short_name: "MoneyFamily",
    description: "แอปจัดการเงินและหารบิลครอบครัว เชื่อมต่อ LINE และ PWA",
    start_url: "/",
    display: "standalone",
    background_color: "#0F2038", // กรมท่า Navy CI
    theme_color: "#F59E0B",      // ส้ม/เหลือง Amber CI
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

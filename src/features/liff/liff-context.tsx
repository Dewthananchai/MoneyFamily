"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Liff } from "@line/liff";

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffContextType {
  liff: Liff | null;
  isReady: boolean;
  isLoggedIn: boolean;
  profile: LineProfile | null;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  isReady: false,
  isLoggedIn: false,
  profile: null,
  error: null,
  login: () => {},
  logout: () => {},
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [liffObject, setLiffObject] = useState<Liff | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initLiff() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      // กรณีอยู่ในโหมด Local Dev แล้วยังไม่ได้ใส่ LIFF ID จริง
      if (!liffId || liffId.includes("your_liff")) {
        console.warn("⚠️ No NEXT_PUBLIC_LIFF_ID found. Using demo mode.");
        if (isMounted) {
          setIsReady(true);
          setIsLoggedIn(true);
          setProfile({
            userId: "U_DEMO_USER_LINE_001",
            displayName: "พ่อบ้านใจกล้า (Demo)",
            pictureUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          });
        }
        return;
      }

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!isMounted) return;
        setLiffObject(liff);
        setIsReady(true);

        if (liff.isLoggedIn()) {
          setIsLoggedIn(true);
          const userProfile = await liff.getProfile();
          if (isMounted) {
            setProfile({
              userId: userProfile.userId,
              displayName: userProfile.displayName,
              pictureUrl: userProfile.pictureUrl,
              statusMessage: userProfile.statusMessage,
            });
          }
        } else {
          // ถ้าอยู่ใน LINE In-App Browser ให้ Auto-login ทันที
          if (liff.isInClient()) {
            liff.login();
          }
        }
      } catch (err: any) {
        console.error("❌ LIFF Init Error:", err);
        if (isMounted) {
          setError(err?.message || "Failed to initialize LIFF");
          setIsReady(true);
        }
      }
    }

    initLiff();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = () => {
    if (liffObject && !liffObject.isLoggedIn()) {
      liffObject.login();
    }
  };

  const logout = () => {
    if (liffObject && liffObject.isLoggedIn()) {
      liffObject.logout();
      setIsLoggedIn(false);
      setProfile(null);
    }
  };

  return (
    <LiffContext.Provider
      value={{
        liff: liffObject,
        isReady,
        isLoggedIn,
        profile,
        error,
        login,
        logout,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
}


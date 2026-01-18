"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    // Check if user has a session token
    const token = localStorage.getItem("axon_session_token");
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-pulse border border-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t("common.redirecting")}
        </span>
      </div>
    </div>
  );
}

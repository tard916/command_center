"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export function TopBar() {
  const [mode, setMode] = useState<"LOCAL" | "CLOUD" | null>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setMode(d.mode))
      .catch(() => setMode("CLOUD"));

    const interval = setInterval(() => {
      fetch("/api/chat")
        .then((r) => r.json())
        .then((d) => setMode(d.mode))
        .catch(() => setMode("CLOUD"));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        {mode && (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                mode === "LOCAL" ? "bg-emerald-400 animate-pulse" : "bg-blue-400"
              }`}
            />
            <span className={`text-xs font-medium ${mode === "LOCAL" ? "text-emerald-400" : "text-blue-400"}`}>
              {mode}
            </span>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

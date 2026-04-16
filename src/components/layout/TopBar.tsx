"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

interface SpendAgent {
  agentId: string;
  agentName: string;
  costUsd: number;
}

interface SpendData {
  currentMonth: string;
  totalCostUsd: number;
  byAgent?: SpendAgent[];
}

export function TopBar() {
  const [mode, setMode] = useState<"LOCAL" | "CLOUD" | null>(null);
  const [spend, setSpend] = useState<SpendData | null>(null);
  const [showSpendDetails, setShowSpendDetails] = useState(false);

  // CC-29: Fetch health status and spend data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch mode
      try {
        const modeRes = await fetch("/api/chat");
        const modeData = await modeRes.json();
        setMode(modeData.mode);
      } catch {
        setMode("CLOUD");
      }

      // Fetch spend data (only for CLOUD mode to avoid unnecessary queries)
      try {
        const spendRes = await fetch("/api/costs/summary");
        if (spendRes.ok) {
          const spendData = await spendRes.json();
          setSpend(spendData);
        }
      } catch {
        // Spend data is optional
      }
    };

    fetchData();

    // Poll health every 15s, spend data every 60s (less frequent)
    const healthInterval = setInterval(fetchData, 15000);
    const spendInterval = setInterval(() => {
      fetch("/api/costs/summary")
        .then((r) => r.json())
        .then((d) => setSpend(d))
        .catch(() => {});
    }, 60000);

    return () => {
      clearInterval(healthInterval);
      clearInterval(spendInterval);
    };
  }, []);

  return (
    <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        {/* CC-29: Spend widget */}
        {spend && (
          <div className="relative">
            <button
              onClick={() => setShowSpendDetails(!showSpendDetails)}
              className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium bg-zinc-800 hover:bg-zinc-700 transition-colors text-amber-400"
              title={`Monthly spend for ${spend.currentMonth}`}
            >
              <span>💰</span>
              <span>${spend.totalCostUsd.toFixed(2)}</span>
            </button>

            {/* CC-29: Spend details tooltip */}
            {showSpendDetails && spend && (
              <div className="absolute right-0 top-full mt-2 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-10 min-w-max p-3 text-xs">
                <div className="font-medium text-zinc-200 mb-2">
                  Monthly Spend ({spend.currentMonth})
                </div>
                <div className="text-zinc-400">
                  Total: <span className="text-amber-400">${spend.totalCostUsd.toFixed(2)}</span>
                </div>
                {spend.byAgent && spend.byAgent.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-700">
                    <div className="text-zinc-400 mb-1">By Agent:</div>
                    {spend.byAgent.slice(0, 5).map((a) => (
                      <div key={a.agentId} className="text-zinc-500">
                        {a.agentName}: ${a.costUsd.toFixed(2)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode && (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                mode === "LOCAL" ? "bg-emerald-400 animate-pulse" : "bg-blue-400"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                mode === "LOCAL" ? "text-emerald-400" : "text-blue-400"
              }`}
              title={mode === "LOCAL" ? "Local MCP Bridge" : "Anthropic API (Fallback)"}
            >
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

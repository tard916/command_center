"use client";

import { useState, useCallback } from "react";

interface Props {
  initialContent: string;
  snapshots: string[];
}

export function ContextEditor({ initialContent, snapshots }: Props) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [content]);

  const broadcast = useCallback(async () => {
    setBroadcasting(true);
    await save();
    // Future: notify active agent conversations
    setTimeout(() => setBroadcasting(false), 1500);
  }, [save]);

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
        </button>
        <button
          onClick={broadcast}
          disabled={broadcasting}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {broadcasting ? "Broadcasting…" : "📡 Broadcast Update"}
        </button>
        <span className="text-xs text-zinc-500">
          {snapshots.length > 0 && `${snapshots.length} saved snapshot${snapshots.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 min-h-[500px] bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-zinc-200 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        placeholder="Write the global context here in Markdown…

This document is injected into every agent's prompt.
Use it to describe: the company, active projects, current priorities, team norms, and anything agents should always know."
      />

      <p className="text-xs text-zinc-600">
        Tip: Write in Markdown. Every agent reads this before acting. Keep it concise — only include what every agent must know.
      </p>
    </div>
  );
}

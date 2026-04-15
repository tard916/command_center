"use client";

import { useState, useCallback } from "react";

interface Props {
  initialContent: string;
  snapshots: string[];
}

// Minimal inline markdown → HTML conversion (no external deps)
function markdownToHtml(md: string): string {
  let html = md
    // Escape raw HTML to avoid XSS from content itself
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, (_m, code: string) => {
    return `<pre class="bg-zinc-800 rounded p-3 overflow-x-auto text-xs my-2"><code>${code.trimEnd()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-800 rounded px-1 text-xs">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-zinc-100 mt-4 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-zinc-100 mt-5 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-zinc-100 mt-6 mb-2">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered list items — group consecutive lines
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/(<li[\s\S]*?<\/li>\n?)+/g, (match) => `<ul class="my-2 space-y-0.5">${match}</ul>`);

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="border-zinc-700 my-4" />');

  // Paragraphs: wrap double-newline separated blocks that aren't already HTML
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (block.startsWith("<")) return block;
      const singleLines = block.replace(/\n/g, "<br />");
      return `<p class="text-zinc-300 leading-relaxed my-2">${singleLines}</p>`;
    })
    .join("\n");

  return html;
}

export function ContextEditor({ initialContent, snapshots }: Props) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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
    setBroadcastMsg(null);
    try {
      await save();
      const res = await fetch("/api/context/broadcast", { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { agentsNotified: number };
        setBroadcastMsg(`✓ Saved & broadcasted to ${data.agentsNotified} agent${data.agentsNotified !== 1 ? "s" : ""}`);
        setTimeout(() => setBroadcastMsg(null), 3000);
      }
    } finally {
      setBroadcasting(false);
    }
  }, [save]);

  const restoreSnapshot = useCallback((snapshotContent: string) => {
    setContent(snapshotContent);
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={save}
          disabled={saving}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
        </button>

        <button
          onClick={() => setPreview((v) => !v)}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {preview ? "Edit" : "Preview"}
        </button>

        <button
          onClick={broadcast}
          disabled={broadcasting}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {broadcasting ? "Broadcasting…" : "📡 Broadcast Update"}
        </button>

        {broadcastMsg && (
          <span className="text-xs text-violet-400 font-medium">{broadcastMsg}</span>
        )}

        {!broadcastMsg && snapshots.length > 0 && (
          <span className="text-xs text-zinc-500">
            {snapshots.length} saved snapshot{snapshots.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {preview ? (
        <div
          className="flex-1 min-h-[500px] bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-sm overflow-auto"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
        />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 min-h-[500px] bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-zinc-200 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          placeholder="Write the global context here in Markdown…

This document is injected into every agent's prompt.
Use it to describe: the company, active projects, current priorities, team norms, and anything agents should always know."
        />
      )}

      {snapshots.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <span className="font-medium">History ({snapshots.length})</span>
            <span>{historyOpen ? "▲" : "▼"}</span>
          </button>

          {historyOpen && (
            <div className="divide-y divide-zinc-800">
              {snapshots.map((snap, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-xs text-zinc-400 truncate flex-1">
                    <span className="text-zinc-500 mr-2">Snapshot {i + 1} —</span>
                    {snap.slice(0, 80)}{snap.length > 80 ? "…" : ""}
                  </span>
                  <button
                    onClick={() => restoreSnapshot(snap)}
                    className="shrink-0 text-xs text-violet-400 hover:text-violet-300 border border-violet-800 hover:border-violet-600 px-2 py-0.5 rounded transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-zinc-600">
        Tip: Write in Markdown. Every agent reads this before acting. Keep it concise — only include what every agent must know.
      </p>
    </div>
  );
}

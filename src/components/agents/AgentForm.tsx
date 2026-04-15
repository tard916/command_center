"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATAR_OPTIONS = ["🤖", "🧠", "⚙️", "🔬", "🎯", "🛠️", "📊", "🚀", "🔧", "💡", "🎨", "📝"];

interface AgentFormProps {
  initial?: {
    id?: string;
    name?: string;
    avatar?: string;
    role?: string;
    soul?: string;
    skills?: string[];
  };
  onClose?: () => void;
}

export function AgentForm({ initial, onClose }: AgentFormProps) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [name, setName] = useState(initial?.name ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? "🤖");
  const [role, setRole] = useState(initial?.role ?? "");
  const [soul, setSoul] = useState(initial?.soul ?? "");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");

    const body = { name: name.trim(), avatar, role: role.trim(), soul: soul.trim(), skills };

    const res = isEdit
      ? await fetch(`/api/agents/${initial!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (!res.ok) {
      setError("Failed to save agent");
      setSaving(false);
      return;
    }

    const agent = await res.json();
    router.refresh();
    if (isEdit) {
      onClose?.();
    } else {
      router.push(`/agents/${agent.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-2">Avatar</label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_OPTIONS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAvatar(a)}
              className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                avatar === a ? "bg-violet-600/40 ring-2 ring-violet-500" : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Backend Engineer"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Role</label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Builds and maintains APIs"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Soul */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Soul (system prompt)</label>
        <textarea
          value={soul}
          onChange={(e) => setSoul(e.target.value)}
          rows={4}
          placeholder="You are a senior backend engineer at 224 TECH..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-y"
        />
      </div>

      {/* Skills */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Skills</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            placeholder="Add a skill and press Enter"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
          <button
            type="button"
            onClick={addSkill}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            Add
          </button>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full">
                {s}
                <button type="button" onClick={() => removeSkill(s)} className="text-zinc-500 hover:text-red-400 transition-colors">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-1">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create agent"}
        </button>
      </div>
    </form>
  );
}

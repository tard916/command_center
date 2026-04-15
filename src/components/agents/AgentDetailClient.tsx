"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentForm } from "./AgentForm";

type Conversation = {
  id: string;
  mode: string;
  messages: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type Agent = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  soul: string;
  skills: string[];
  status: string;
  workingContext: string;
  createdAt: Date;
  updatedAt: Date;
  conversations: Conversation[];
  _count: { tasks: number };
};

interface Props {
  agent: Agent;
}

type Tab = "soul" | "skills" | "context" | "activity";

export function AgentDetailClient({ agent: initial }: Props) {
  const router = useRouter();
  const [agent, setAgent] = useState(initial);
  const [tab, setTab] = useState<Tab>("soul");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Soul editor state
  const [soul, setSoul] = useState(agent.soul);
  const [savingSoul, setSavingSoul] = useState(false);

  // Skills state
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(agent.skills);
  const [savingSkills, setSavingSkills] = useState(false);

  // Working context state
  const [workingContext, setWorkingContext] = useState(agent.workingContext);
  const [savingContext, setSavingContext] = useState(false);

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setAgent((prev) => ({ ...prev, ...updated }));
      router.refresh();
    }
    return res.ok;
  }

  async function saveSoul() {
    setSavingSoul(true);
    await patch({ soul });
    setSavingSoul(false);
  }

  async function saveSkills() {
    setSavingSkills(true);
    await patch({ skills });
    setSavingSkills(false);
  }

  async function saveContext() {
    setSavingContext(true);
    await patch({ workingContext });
    setSavingContext(false);
  }

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

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/agents");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  const statusColors: Record<string, string> = {
    WORKING: "bg-emerald-500/20 text-emerald-400",
    ERROR: "bg-red-500/20 text-red-400",
    IDLE: "bg-zinc-700 text-zinc-400",
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "soul", label: "Soul" },
    { id: "skills", label: `Skills (${skills.length})` },
    { id: "context", label: "Working Context" },
    { id: "activity", label: `Activity (${agent.conversations.length})` },
  ];

  return (
    <>
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{agent.avatar}</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-zinc-100">{agent.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[agent.status] ?? statusColors.IDLE}`}>
                  {agent.status.toLowerCase()}
                </span>
              </div>
              <p className="text-zinc-400 text-sm mt-0.5">{agent.role || "No role set"}</p>
              <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                <span>{agent._count.tasks} tasks assigned</span>
                <span>{agent.conversations.length} conversations</span>
                <span>{skills.length} skills</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "text-violet-300 border-violet-500"
                  : "text-zinc-400 border-transparent hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "soul" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-300 mb-1">System Prompt</h2>
            <p className="text-xs text-zinc-500 mb-3">
              Defines who this agent is, how it thinks, and how it responds. Injected as the system message in every conversation.
            </p>
          </div>
          <textarea
            value={soul}
            onChange={(e) => setSoul(e.target.value)}
            rows={14}
            placeholder="You are a senior backend engineer at 224 TECH..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-y font-mono"
          />
          <div className="flex justify-end">
            <button
              onClick={saveSoul}
              disabled={savingSoul || soul === agent.soul}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {savingSoul ? "Saving…" : "Save soul"}
            </button>
          </div>
        </div>
      )}

      {tab === "skills" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-300 mb-1">Assigned Skills</h2>
            <p className="text-xs text-zinc-500 mb-3">
              Skills are injected into the agent&apos;s prompt as a bulleted list, signalling its capabilities.
            </p>
          </div>

          <div className="flex gap-2">
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

          {skills.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">No skills assigned yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 bg-zinc-800 text-zinc-300 text-sm px-3 py-1.5 rounded-full">
                  {s}
                  <button onClick={() => removeSkill(s)} className="text-zinc-500 hover:text-red-400 transition-colors text-base leading-none">×</button>
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={saveSkills}
              disabled={savingSkills || JSON.stringify(skills) === JSON.stringify(agent.skills)}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {savingSkills ? "Saving…" : "Save skills"}
            </button>
          </div>
        </div>
      )}

      {tab === "context" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-300 mb-1">Working Context</h2>
            <p className="text-xs text-zinc-500 mb-3">
              Auto-updated after each conversation. Captures what this agent is currently focused on. Injected into every prompt.
            </p>
          </div>
          <textarea
            value={workingContext}
            onChange={(e) => setWorkingContext(e.target.value)}
            rows={10}
            placeholder="Currently working on..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-y"
          />
          <div className="flex justify-end">
            <button
              onClick={saveContext}
              disabled={savingContext || workingContext === agent.workingContext}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {savingContext ? "Saving…" : "Save context"}
            </button>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Conversation History</h2>
          {agent.conversations.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-zinc-500 text-sm">No activity yet</p>
              <p className="text-zinc-600 text-xs mt-1">Conversations will appear here once you start chatting with this agent</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agent.conversations.map((conv) => {
                const msgs = Array.isArray(conv.messages) ? conv.messages as Array<{role: string; content: string}> : [];
                const lastMsg = msgs[msgs.length - 1];
                return (
                  <div key={conv.id} className="bg-zinc-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${conv.mode === "LOCAL" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {conv.mode}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(conv.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    {lastMsg && (
                      <p className="text-zinc-400 text-sm line-clamp-2">
                        <span className="text-zinc-500 mr-1">{lastMsg.role}:</span>
                        {lastMsg.content}
                      </p>
                    )}
                    <p className="text-zinc-600 text-xs">{msgs.length} messages</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-zinc-100 mb-5">Edit Agent</h2>
            <AgentForm
              initial={{ id: agent.id, name: agent.name, avatar: agent.avatar, role: agent.role, soul: agent.soul, skills: skills }}
              onClose={() => { setEditing(false); router.refresh(); }}
            />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">Delete {agent.name}?</h2>
            <p className="text-zinc-400 text-sm mb-5">This will permanently delete the agent and all associated conversations. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

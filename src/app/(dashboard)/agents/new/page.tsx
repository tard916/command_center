import Link from "next/link";
import { AgentForm } from "@/components/agents/AgentForm";

export default function NewAgentPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/agents" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          ← Agents
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300 text-sm">New Agent</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Create Agent</h1>
        <p className="text-zinc-400 text-sm mt-1">Define your AI team member&apos;s identity and capabilities</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <AgentForm />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AgentsPage() {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true, conversations: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Agents</h1>
          <p className="text-zinc-400 text-sm mt-1">Your AI team — each with a soul, skills, and context</p>
        </div>
        <Link
          href="/agents/new"
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="text-zinc-200 font-medium mb-1">No agents yet</h3>
          <p className="text-zinc-500 text-sm mb-4">Create your first AI team member</p>
          <Link
            href="/agents/new"
            className="inline-flex items-center bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Create Agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{agent.avatar}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  agent.status === "WORKING"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : agent.status === "ERROR"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-zinc-700 text-zinc-400"
                }`}>
                  {agent.status.toLowerCase()}
                </span>
              </div>
              <h3 className="font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
                {agent.name}
              </h3>
              <p className="text-zinc-400 text-sm mt-0.5">{agent.role || "No role set"}</p>
              {agent.workingContext && (
                <p className="text-zinc-500 text-xs mt-2 line-clamp-2">{agent.workingContext}</p>
              )}
              <div className="flex gap-3 mt-4 text-xs text-zinc-500">
                <span>{agent._count.tasks} tasks</span>
                <span>{agent._count.conversations} chats</span>
                <span>{agent.skills.length} skills</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

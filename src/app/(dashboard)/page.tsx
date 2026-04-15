import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureGlobalContext } from "@/lib/context";

export default async function DashboardPage() {
  await ensureGlobalContext();

  const [agents, projects, tasks] = await Promise.all([
    prisma.agent.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.project.findMany({ include: { _count: { select: { tasks: true } } } }),
    prisma.task.findMany({ where: { status: { not: "DONE" } } }),
  ]);

  const workingAgents = agents.filter((a) => a.status === "WORKING");
  const criticalTasks = tasks.filter((t) => t.priority === "CRITICAL");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Command Center</h1>
        <p className="text-zinc-400 text-sm mt-1">224 TECH — AI Agent Orchestration Dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Agents", value: agents.length, icon: "🤖", color: "violet" },
          { label: "Active Now", value: workingAgents.length, icon: "⚡", color: "emerald" },
          { label: "Projects", value: projects.length, icon: "📁", color: "blue" },
          { label: "Open Tasks", value: tasks.length, icon: "📋", color: "amber" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-zinc-100">{stat.value}</div>
            <div className="text-sm text-zinc-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent roster */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Your Team</h2>
          {agents.length === 0 ? (
            <p className="text-zinc-500 text-sm">No agents yet. <Link href="/agents" className="text-violet-400 hover:underline">Create your first agent →</Link></p>
          ) : (
            <div className="space-y-3">
              {agents.slice(0, 5).map((agent) => (
                <div key={agent.id} className="flex items-center gap-3">
                  <div className="text-2xl">{agent.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200">{agent.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{agent.role || "No role set"}</div>
                  </div>
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
              ))}
            </div>
          )}
        </div>

        {/* Critical tasks */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Critical Tasks</h2>
          {criticalTasks.length === 0 ? (
            <p className="text-zinc-500 text-sm">No critical tasks. All clear.</p>
          ) : (
            <div className="space-y-3">
              {criticalTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-start gap-3">
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full mt-0.5 shrink-0">
                    CRITICAL
                  </span>
                  <span className="text-sm text-zinc-300">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

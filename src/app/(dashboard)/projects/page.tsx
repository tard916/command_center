import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tasks: true } },
      agents: { include: { agent: { select: { id: true, name: true, avatar: true } } } },
      tasks: { where: { status: { not: "DONE" } }, select: { status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Projects</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage work across your agent team</p>
        </div>
        <Link
          href="/projects/new"
          className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📁</div>
          <h3 className="text-zinc-200 font-medium mb-1">No projects yet</h3>
          <p className="text-zinc-500 text-sm mb-4">Create your first project to start tracking work</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const openTasks = project.tasks.length;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">📁</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    project.status === "active"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-zinc-700 text-zinc-400"
                  }`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex -space-x-1.5">
                    {project.agents.slice(0, 4).map(({ agent }) => (
                      <div
                        key={agent.id}
                        className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-sm"
                        title={agent.name}
                      >
                        {agent.avatar}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-zinc-500">{openTasks} open tasks</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

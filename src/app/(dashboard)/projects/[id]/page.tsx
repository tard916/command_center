import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { ProjectDetailHeader } from "@/components/projects/ProjectDetailHeader";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;

  const [project, allAgents] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        agents: { include: { agent: true } },
        tasks: {
          orderBy: { createdAt: "asc" },
          include: { assignedAgent: { select: { id: true, name: true, avatar: true } } },
        },
      },
    }),
    prisma.agent.findMany({ select: { id: true, name: true, avatar: true }, orderBy: { name: "asc" } }),
  ]);

  if (!project) notFound();

  const tasks = project.tasks.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  const agents = allAgents;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          ← Projects
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300 text-sm">{project.name}</span>
      </div>

      <ProjectDetailHeader project={{ id: project.id, name: project.name, description: project.description, status: project.status }} />

      <KanbanBoard
        initialTasks={tasks}
        projectId={project.id}
        agents={agents}
      />
    </div>
  );
}

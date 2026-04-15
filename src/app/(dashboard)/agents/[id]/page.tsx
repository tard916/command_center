export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AgentDetailClient } from "@/components/agents/AgentDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: Props) {
  const { id } = await params;
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      conversations: {
        orderBy: { updatedAt: "desc" },
        take: 50,
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!agent) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/agents" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          ← Agents
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300 text-sm">{agent.name}</span>
      </div>

      <AgentDetailClient agent={agent} />
    </div>
  );
}

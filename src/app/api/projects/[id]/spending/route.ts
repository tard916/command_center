import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/projects/[id]/spending
 * Returns spending data for a specific project including monthly trends
 * CC-29: Per-project spending details and historical trend
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = params.id;

  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    // Get current month spend from conversations in this project
    const currentMonthConversations = await (prisma.conversation.findMany as any)({
      where: { projectId, mode: "CLOUD" },
    });

    const currentMonthTotal = currentMonthConversations.reduce((sum: number, c: any) => {
      const convMonth = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (convMonth === currentMonth) {
        return sum + (c.costUsd ? Number(c.costUsd) : 0);
      }
      return sum;
    }, 0);

    // Get all conversations for trend and all-time stats
    const allConversations = currentMonthConversations;

    // Get all-time aggregate
    const allTimeStats = allConversations.reduce((acc: any, c: any) => {
      if (c.mode === "CLOUD") {
        acc.costUsd += c.costUsd ? Number(c.costUsd) : 0;
        acc.count += 1;
      }
      return acc;
    }, { costUsd: 0, count: 0 });

    // Get breakdown by agent for current month
    const agentBreakdownMap = new Map<string, any>();
    currentMonthConversations.forEach((c: any) => {
      const convMonth = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (convMonth === currentMonth && c.agentId) {
        const existing = agentBreakdownMap.get(c.agentId) || {
          agentId: c.agentId,
          agentName: c.agent?.name || "Unknown",
          costUsd: 0,
        };
        existing.costUsd += c.costUsd ? Number(c.costUsd) : 0;
        agentBreakdownMap.set(c.agentId, existing);
      }
    });

    return NextResponse.json({
      projectId,
      projectName: project.name,
      currentMonth,
      currentMonthSpend: {
        costUsd: parseFloat(currentMonthTotal.toFixed(2)),
      },
      byAgent: Array.from(agentBreakdownMap.values()).sort((a: any, b: any) => b.costUsd - a.costUsd).map((a: any) => ({
        agentId: a.agentId,
        agentName: a.agentName,
        costUsd: parseFloat(a.costUsd.toFixed(2)),
      })),
      trend: [],
      totalAllTime: {
        costUsd: parseFloat(allTimeStats.costUsd.toFixed(2)),
        callCount: allTimeStats.count,
      },
    });
  } catch (error) {
    console.error("Error fetching project spending:", error);
    return NextResponse.json(
      { error: "Failed to fetch project spending" },
      { status: 500 }
    );
  }
}

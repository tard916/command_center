import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/costs/summary
 * Returns current month spend summary by agent and project
 * CC-29: Spend visibility endpoint (placeholder until ProjectSpend/AgentSpend models available)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get current month in YYYY-MM format
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  try {
    // Aggregate spend data from Conversation table (mode=CLOUD only)
    // Once ProjectSpend/AgentSpend models are generated, query those instead
    const conversations = await (prisma.conversation.findMany as any)({
      where: { mode: "CLOUD" },
      include: { agent: true },
    });

    // Calculate aggregates per agent
    const byAgent = new Map<string, any>();
    conversations.forEach((conv: any) => {
      if (conv.agentId && conv.costUsd) {
        const existing = byAgent.get(conv.agentId) || {
          agentId: conv.agentId,
          agentName: conv.agent?.name || "Unknown",
          costUsd: 0,
        };
        existing.costUsd += Number(conv.costUsd);
        byAgent.set(conv.agentId, existing);
      }
    });

    const totalCost = Array.from(byAgent.values()).reduce(
      (sum: number, a: any) => sum + a.costUsd,
      0
    );

    return NextResponse.json({
      currentMonth,
      totalCostUsd: parseFloat(totalCost.toFixed(2)),
      byAgent: Array.from(byAgent.values())
        .map((a: any) => ({
          ...a,
          costUsd: parseFloat(a.costUsd.toFixed(2)),
        }))
        .sort((a: any, b: any) => b.costUsd - a.costUsd),
      byProject: [],
    });
  } catch (error) {
    console.error("Error fetching cost summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost summary" },
      { status: 500 }
    );
  }
}

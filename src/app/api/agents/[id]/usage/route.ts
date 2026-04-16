import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/agents/[id]/usage
 * Returns usage and cost breakdown for a specific agent
 * CC-29: Per-agent usage details (placeholder until AgentSpend model available)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = params.id;

  try {
    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    // Get all conversations for this agent (CLOUD mode only)
    const conversations = await prisma.conversation.findMany({
      where: { agentId, mode: "CLOUD" },
    });

    // Calculate current month stats
    const currentMonthConversations = conversations.filter((c: any) => {
      const convMonth = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
      return convMonth === currentMonth;
    });

    const currentInputTokens = currentMonthConversations.reduce(
      (sum: number, c: any) => sum + (c.inputTokens || 0),
      0
    );
    const currentOutputTokens = currentMonthConversations.reduce(
      (sum: number, c: any) => sum + (c.outputTokens || 0),
      0
    );
    const currentCacheReadTokens = currentMonthConversations.reduce(
      (sum: number, c: any) => sum + (c.cacheReadTokens || 0),
      0
    );
    const currentCostUsd = currentMonthConversations.reduce(
      (sum: number, c: any) => sum + (c.costUsd ? Number(c.costUsd) : 0),
      0
    );

    // Pricing for breakdown
    const INPUT_PRICE_PER_MILLION = 3;
    const OUTPUT_PRICE_PER_MILLION = 15;
    const CACHE_READ_PRICE_PER_MILLION = 0.3;

    const currentCostBreakdown = {
      input: parseFloat(
        ((currentInputTokens * INPUT_PRICE_PER_MILLION) / 1_000_000).toFixed(6)
      ),
      output: parseFloat(
        ((currentOutputTokens * OUTPUT_PRICE_PER_MILLION) / 1_000_000).toFixed(6)
      ),
      cacheRead: parseFloat(
        ((currentCacheReadTokens * CACHE_READ_PRICE_PER_MILLION) / 1_000_000).toFixed(6)
      ),
    };

    // All-time stats
    const allTimeInputTokens = conversations.reduce(
      (sum: number, c: any) => sum + (c.inputTokens || 0),
      0
    );
    const allTimeOutputTokens = conversations.reduce(
      (sum: number, c: any) => sum + (c.outputTokens || 0),
      0
    );
    const allTimeCacheReadTokens = conversations.reduce(
      (sum: number, c: any) => sum + (c.cacheReadTokens || 0),
      0
    );
    const allTimeCostUsd = conversations.reduce(
      (sum: number, c: any) => sum + (c.costUsd ? Number(c.costUsd) : 0),
      0
    );

    return NextResponse.json({
      agentId,
      agentName: agent.name,
      currentMonth,
      currentMonthSpend: {
        costUsd: parseFloat(currentCostUsd.toFixed(2)),
        inputTokens: currentInputTokens,
        outputTokens: currentOutputTokens,
        cacheReadTokens: currentCacheReadTokens,
        costBreakdown: currentCostBreakdown,
      },
      totalAllTime: {
        costUsd: parseFloat(allTimeCostUsd.toFixed(2)),
        callCount: conversations.length,
        inputTokens: allTimeInputTokens,
        outputTokens: allTimeOutputTokens,
        cacheReadTokens: allTimeCacheReadTokens,
      },
    });
  } catch (error) {
    console.error("Error fetching agent usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent usage" },
      { status: 500 }
    );
  }
}

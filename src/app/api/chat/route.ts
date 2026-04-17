import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAgentPrompt } from "@/lib/context";
import { streamChat, checkMcpBridge, UsageData } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, message, threadId } = await req.json();
  if (!agentId || !message) {
    return NextResponse.json({ error: "agentId and message required" }, { status: 400 });
  }

  const { systemPrompt, userMessage } = await buildAgentPrompt(agentId, message);

  // Mark agent as working
  await prisma.agent.update({ where: { id: agentId }, data: { status: "WORKING" } });

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Run async in background, stream SSE to client
  (async () => {
    let fullResponse = "";
    let mode: "LOCAL" | "CLOUD" = "CLOUD";
    let usage: UsageData | undefined;

    try {
      await streamChat(
        systemPrompt,
        userMessage,
        (chunk) => {
          fullResponse += chunk;
          writer.write(encoder.encode(`data: ${chunk}\n\n`));
        },
        (m, u) => {
          mode = m;
          usage = u;
        },
        (error) => {
          // Log error for monitoring/debugging (CC-28: error handling)
          console.warn(`Claude API error in ${mode} mode:`, error.message);
        }
      );

      // Persist conversation (with optional threadId support)
      const convWhere: { agentId: string; threadId?: string } = { agentId };
      if (threadId) convWhere.threadId = threadId;

      const conv = await prisma.conversation.findFirst({
        where: convWhere,
        orderBy: { updatedAt: "desc" },
      });

      const messages = conv ? (conv.messages as { role: string; content: string }[]) : [];
      messages.push({ role: "user", content: userMessage });
      messages.push({ role: "assistant", content: fullResponse });

      // Auto-generate threadId if not provided
      const assignedThreadId = threadId || crypto.randomUUID();

      // CC-27: Persist usage data (CLOUD mode only)
      interface ConversationData {
        messages: Array<{ role: string; content: string }>;
        mode: string;
        inputTokens?: number;
        outputTokens?: number;
        cacheCreationTokens?: number;
        cacheReadTokens?: number;
        costUsd?: number;
        projectId?: string;
      }
      const conversationData: ConversationData = {
        messages,
        mode,
      };
      if (usage && mode === "CLOUD") {
        conversationData.inputTokens = usage.input_tokens;
        conversationData.outputTokens = usage.output_tokens;
        conversationData.cacheCreationTokens = usage.cache_creation_input_tokens;
        conversationData.cacheReadTokens = usage.cache_read_input_tokens;

        // CC-29: Calculate cost (pricing: $3/1M input, $15/1M output, $0.30/1M cache_read)
        const costUsd =
          (usage.input_tokens * 3) / 1_000_000 +
          (usage.output_tokens * 15) / 1_000_000 +
          (usage.cache_read_input_tokens * 0.3) / 1_000_000;
        conversationData.costUsd = parseFloat(costUsd.toFixed(6));
      }

      if (conv) {
        await prisma.conversation.update({
          where: { id: conv.id },
          data: conversationData,
        });
      } else {
        await prisma.conversation.create({
          data: { agentId, threadId: assignedThreadId, ...conversationData },
        });
      }

      // CC-29: Update spend aggregates and check alerts (CLOUD mode only)
      if (usage && mode === "CLOUD") {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        // Upsert AgentSpend aggregation
        const agentSpend = await prisma.agentSpend.upsert({
          where: { agentId_month: { agentId, month } },
          create: {
            agentId,
            month,
            totalInputTokens: usage.input_tokens,
            totalOutputTokens: usage.output_tokens,
            totalCacheReadTokens: usage.cache_read_input_tokens,
            totalCostUsd: conversationData.costUsd,
          },
          update: {
            totalInputTokens: { increment: usage.input_tokens },
            totalOutputTokens: { increment: usage.output_tokens },
            totalCacheReadTokens: { increment: usage.cache_read_input_tokens },
            totalCostUsd: { increment: conversationData.costUsd },
          },
        });

        // CC-29: Check spend alert threshold
        const SPEND_ALERT_THRESHOLD = parseFloat(
          process.env.SPEND_ALERT_THRESHOLD_USD || "10"
        );
        if (agentSpend && Number(agentSpend.totalCostUsd) > SPEND_ALERT_THRESHOLD) {
          console.warn(
            `🚨 Agent ${agentId} exceeded monthly budget: $${Number(agentSpend.totalCostUsd).toFixed(2)} > $${SPEND_ALERT_THRESHOLD}`
          );
        }

        // Upsert ProjectSpend aggregation (if agent has a project)
        const agentProject = await prisma.projectAgent.findFirst({
          where: { agentId },
          select: { projectId: true },
        });
        if (agentProject) {
          await prisma.projectSpend.upsert({
            where: {
              projectId_agentId_month: {
                projectId: agentProject.projectId,
                agentId,
                month,
              },
            },
            create: {
              projectId: agentProject.projectId,
              agentId,
              month,
              totalInputTokens: usage.input_tokens,
              totalOutputTokens: usage.output_tokens,
              totalCacheReadTokens: usage.cache_read_input_tokens,
              totalCostUsd: conversationData.costUsd,
            },
            update: {
              totalInputTokens: { increment: usage.input_tokens },
              totalOutputTokens: { increment: usage.output_tokens },
              totalCacheReadTokens: { increment: usage.cache_read_input_tokens },
              totalCostUsd: { increment: conversationData.costUsd },
            },
          });
        }
      }

      // Update agent working context
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: "IDLE",
          workingContext: `Last task: ${userMessage.slice(0, 200)}`,
        },
      });

      writer.write(encoder.encode(`data: [DONE]\n\n`));
    } catch (err) {
      await prisma.agent.update({ where: { id: agentId }, data: { status: "ERROR" } });

      // CC-28: Provide better error messages
      let errorMessage = "An error occurred";
      if (err instanceof Error) {
        if (err.message.includes("ANTHROPIC_API_KEY")) {
          errorMessage = "API key not configured. Enable CLOUD mode with ANTHROPIC_API_KEY.";
        } else if (err.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        } else if (err.message.includes("Rate limit")) {
          errorMessage = "Rate limited. Please wait before retrying.";
        } else if (err.message.includes("Invalid")) {
          errorMessage = "Invalid API credentials. Check ANTHROPIC_API_KEY.";
        } else {
          errorMessage = err.message;
        }
      }

      writer.write(encoder.encode(`data: [ERROR: ${errorMessage}]\n\n`));
      console.error("Chat error:", err);
    } finally {
      writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET() {
  const isLocal = await checkMcpBridge();
  return NextResponse.json({ mode: isLocal ? "LOCAL" : "CLOUD" });
}

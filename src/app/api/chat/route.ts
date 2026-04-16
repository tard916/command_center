import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAgentPrompt } from "@/lib/context";
import { streamChat, checkMcpBridge } from "@/lib/claude";

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

    try {
      await streamChat(
        systemPrompt,
        userMessage,
        (chunk) => {
          fullResponse += chunk;
          writer.write(encoder.encode(`data: ${chunk}\n\n`));
        },
        (m) => { mode = m; }
      );

      // Persist conversation (with optional threadId support)
      const convWhere: any = { agentId };
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

      if (conv) {
        await prisma.conversation.update({
          where: { id: conv.id },
          data: { messages, mode },
        });
      } else {
        await prisma.conversation.create({
          data: { agentId, messages, mode, threadId: assignedThreadId },
        });
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
      writer.write(encoder.encode(`data: [ERROR]\n\n`));
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

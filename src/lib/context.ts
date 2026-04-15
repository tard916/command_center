import { prisma } from "./prisma";

export async function buildAgentPrompt(
  agentId: string,
  taskPrompt: string
): Promise<{ systemPrompt: string; userMessage: string }> {
  const [agent, globalCtx] = await Promise.all([
    prisma.agent.findUniqueOrThrow({ where: { id: agentId } }),
    prisma.globalContext.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);

  const parts: string[] = [];

  if (globalCtx?.content) {
    parts.push(`# GLOBAL CONTEXT — 224 TECH\n\n${globalCtx.content}`);
  }

  parts.push(`# YOUR IDENTITY\n\n${agent.soul}`);

  if (agent.workingContext) {
    parts.push(`# YOUR CURRENT FOCUS\n\n${agent.workingContext}`);
  }

  if (agent.skills.length > 0) {
    parts.push(
      `# YOUR ASSIGNED SKILLS\n\n${agent.skills.map((s) => `- ${s}`).join("\n")}`
    );
  }

  const systemPrompt = parts.join("\n\n---\n\n");

  return { systemPrompt, userMessage: taskPrompt };
}

export async function ensureGlobalContext(): Promise<void> {
  const existing = await prisma.globalContext.findFirst();
  if (!existing) {
    await prisma.globalContext.create({
      data: {
        content: `# 224 TECH — Company Context

## Company
224 TECH is a software company building products for individuals and businesses. It operates as a solo-developer company augmented by AI agents.

## Working Style
- The human operator (CEO/Board) sets direction and makes final decisions
- Agents execute, research, design, and build under direction
- All agents should be aware of each other's work via this context document
- Update this document whenever significant decisions or changes happen

## Active Projects
(Add your active projects here)

## Current Priorities
(Add current sprint priorities here)

## Team Norms
- Always flag blockers immediately
- Prefer simple, maintainable solutions over clever ones
- Document decisions in Confluence (space: CCENTER)
- Track work in Jira (project: CC)
`,
      },
    });
  }
}

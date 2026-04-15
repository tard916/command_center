import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureGlobalContext } from "@/lib/context";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureGlobalContext();

  const freshSignal = `[Context updated ${new Date().toISOString()}] — Review global context for latest priorities.`;

  const result = await prisma.agent.updateMany({
    data: { workingContext: freshSignal },
  });

  return NextResponse.json({ agentsNotified: result.count });
}

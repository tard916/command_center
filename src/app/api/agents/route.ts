import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true, conversations: true } } },
  });

  return NextResponse.json(agents);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const agent = await prisma.agent.create({
    data: {
      name: body.name,
      avatar: body.avatar ?? "🤖",
      role: body.role ?? "",
      soul: body.soul ?? "",
      skills: body.skills ?? [],
    },
  });

  return NextResponse.json(agent, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findUnique({
    where: { id: params.id },
    include: { conversations: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });

  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const agent = await prisma.agent.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.soul !== undefined && { soul: body.soul }),
      ...(body.skills !== undefined && { skills: body.skills }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.workingContext !== undefined && { workingContext: body.workingContext }),
    },
  });

  return NextResponse.json(agent);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.agent.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

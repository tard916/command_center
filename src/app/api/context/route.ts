import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureGlobalContext } from "@/lib/context";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureGlobalContext();
  const ctx = await prisma.globalContext.findFirst({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(ctx);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await ensureGlobalContext();

  const existing = await prisma.globalContext.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Keep last 10 snapshots
  const snapshots = (existing.snapshots as string[]) ?? [];
  const newSnapshots = [existing.content, ...snapshots].slice(0, 10);

  const updated = await prisma.globalContext.update({
    where: { id: existing.id },
    data: { content: body.content, snapshots: newSnapshots },
  });

  return NextResponse.json(updated);
}

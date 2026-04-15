import { prisma } from "@/lib/prisma";
import { ensureGlobalContext } from "@/lib/context";
import { ContextEditor } from "@/components/ContextEditor";

export default async function ContextPage() {
  await ensureGlobalContext();
  const ctx = await prisma.globalContext.findFirst({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Global Context</h1>
          <p className="text-zinc-400 text-sm mt-1">
            This document is injected into every agent&apos;s prompt — it&apos;s your team&apos;s shared memory.
          </p>
        </div>
        {ctx && (
          <p className="text-zinc-500 text-xs mt-1">
            Last updated: {new Date(ctx.updatedAt).toLocaleString()}
          </p>
        )}
      </div>

      <ContextEditor
        initialContent={ctx?.content ?? ""}
        snapshots={(ctx?.snapshots as string[]) ?? []}
      />
    </div>
  );
}

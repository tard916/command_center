export const dynamic = "force-dynamic";

import Link from "next/link";
import { ProjectForm } from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          ← Projects
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300 text-sm">New Project</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Create Project</h1>
        <p className="text-zinc-400 text-sm mt-1">Set up a new project for your agent team</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <ProjectForm />
      </div>
    </div>
  );
}

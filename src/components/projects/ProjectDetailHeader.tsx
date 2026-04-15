"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectForm } from "./ProjectForm";

interface Props {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  "on-hold": "bg-yellow-500/20 text-yellow-400",
  completed: "bg-blue-500/20 text-blue-400",
  archived: "bg-zinc-700 text-zinc-400",
};

export function ProjectDetailHeader({ project }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/projects");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="text-4xl mt-0.5">📁</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-zinc-100">{project.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status] ?? STATUS_COLORS.active}`}>
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-zinc-400 text-sm mt-1 max-w-2xl">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-zinc-100 mb-5">Edit Project</h2>
            <ProjectForm
              initial={{ id: project.id, name: project.name, description: project.description, status: project.status }}
              onClose={() => { setEditing(false); router.refresh(); }}
            />
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">Delete {project.name}?</h2>
            <p className="text-zinc-400 text-sm mb-5">This will permanently delete the project and all its tasks. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

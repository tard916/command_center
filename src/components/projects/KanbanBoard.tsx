"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Agent = { id: string; name: string; avatar: string };

type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  assignedAgent: Agent | null;
  createdAt: string;
};

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "TODO", label: "To Do", color: "text-zinc-400" },
  { id: "IN_PROGRESS", label: "In Progress", color: "text-yellow-400" },
  { id: "IN_REVIEW", label: "In Review", color: "text-blue-400" },
  { id: "DONE", label: "Done", color: "text-emerald-400" },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "bg-zinc-700 text-zinc-400",
  MEDIUM: "bg-blue-500/20 text-blue-400",
  HIGH: "bg-orange-500/20 text-orange-400",
  CRITICAL: "bg-red-500/20 text-red-400",
};

function TaskCard({ task, isDragging = false }: { task: Task; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-zinc-800 border border-zinc-700 rounded-lg p-3 cursor-grab active:cursor-grabbing select-none ${isDragging ? "shadow-2xl ring-2 ring-violet-500" : "hover:border-zinc-600"} transition-colors`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-zinc-100 font-medium leading-snug">{task.title}</p>
        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority.charAt(0)}
        </span>
      </div>
      {task.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{task.description}</p>
      )}
      {task.assignedAgent && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-base leading-none">{task.assignedAgent.avatar}</span>
          <span className="text-xs text-zinc-500">{task.assignedAgent.name}</span>
        </div>
      )}
    </div>
  );
}

interface QuickAddProps {
  projectId: string;
  status: TaskStatus;
  agents: Agent[];
  onAdd: (task: Task) => void;
}

function QuickAdd({ projectId, status, agents, onAdd }: QuickAddProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [agentId, setAgentId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), projectId, status, priority, assignedAgentId: agentId || null }),
    });
    if (res.ok) {
      const task = await res.json();
      onAdd(task);
      setTitle("");
      setPriority("MEDIUM");
      setAgentId("");
      setOpen(false);
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1.5 rounded transition-colors"
      >
        + Add task
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-zinc-800 border border-zinc-600 rounded-lg p-3 space-y-2">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
      />
      <div className="flex gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="">Unassigned</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 py-1 rounded text-xs transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-1 rounded text-xs font-medium transition-colors"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}

interface KanbanBoardProps {
  initialTasks: Task[];
  projectId: string;
  agents: Agent[];
}

export function KanbanBoard({ initialTasks, projectId, agents }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function getTasksByStatus(status: TaskStatus) {
    return tasks.filter((t) => t.status === status);
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // If dropped over a column id
    const overColumn = COLUMNS.find((c) => c.id === overId);
    if (overColumn) {
      setTasks((prev) =>
        prev.map((t) => t.id === activeId ? { ...t, status: overColumn.id } : t)
      );
      return;
    }

    // If dropped over another task — move to that task's column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && overTask.status !== tasks.find((t) => t.id === activeId)?.status) {
      setTasks((prev) =>
        prev.map((t) => t.id === activeId ? { ...t, status: overTask.status } : t)
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let newStatus: TaskStatus | null = null;
    const overColumn = COLUMNS.find((c) => c.id === overId);
    if (overColumn) {
      newStatus = overColumn.id;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    if (!newStatus) return;

    // Persist to API
    await fetch(`/api/tasks/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  function handleTaskAdded(task: Task) {
    setTasks((prev) => [...prev, task]);
  }

  async function handleDeleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-4 gap-4 min-h-[400px]">
        {COLUMNS.map((col) => {
          const colTasks = getTasksByStatus(col.id);
          return (
            <div key={col.id} className="flex flex-col gap-2">
              {/* Column header */}
              <div className="flex items-center justify-between px-1">
                <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                  {colTasks.length}
                </span>
              </div>

              {/* Drop zone */}
              <SortableContext
                id={col.id}
                items={colTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className="flex-1 min-h-[200px] bg-zinc-900/50 border border-zinc-800 rounded-xl p-2 space-y-2"
                  data-column-id={col.id}
                >
                  {colTasks.map((task) => (
                    <div key={task.id} className="group relative">
                      <TaskCard task={task} />
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all text-xs w-5 h-5 flex items-center justify-center rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <QuickAdd
                    projectId={projectId}
                    status={col.id}
                    agents={agents}
                    onAdd={handleTaskAdded}
                  />
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard", icon: "⚡" },
  { href: "/agents", label: "Agents", icon: "🤖" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/context", label: "Global Context", icon: "🧠" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⚡</span>
          <div>
            <div className="text-sm font-bold text-zinc-100">224 TECH</div>
            <div className="text-xs text-zinc-500">Command Center</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-600 px-3">v0.1.0</div>
      </div>
    </aside>
  );
}

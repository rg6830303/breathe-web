"use client";

import { useMemo, useState } from "react";
import type { Notice, NoticeType } from "@/lib/types";

const filters: NoticeType[] = ["daily", "weekly", "monthly"];

export function NoticeBoard({ notices }: { notices: Notice[] }) {
  const [active, setActive] = useState<NoticeType>("daily");
  const visible = useMemo(() => notices.filter((notice) => notice.type === active), [active, notices]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-volt">Notice Board</p>
          <h2 className="font-display text-4xl font-black text-white">Club signals, filtered</h2>
        </div>
        <div className="flex rounded-md border border-line bg-panel/70 p-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActive(filter)}
              className={`rounded px-4 py-2 text-sm font-bold capitalize transition ${
                active === filter ? "bg-volt text-midnight" : "text-slate-300 hover:text-white"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {visible.map((notice) => (
          <article key={notice.id} className="glass rounded-lg p-5">
            <div className="mb-4 inline-flex rounded bg-court/20 px-2 py-1 text-xs font-black uppercase text-volt">
              {notice.type}
            </div>
            <h3 className="mb-2 text-xl font-black text-white">{notice.title}</h3>
            <p className="text-sm leading-6 text-slate-300">{notice.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

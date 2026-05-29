"use client";

import { useMemo, useState } from "react";
import { Bell, CalendarRange, Megaphone } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui";
import type { Notice, NoticeType } from "@/lib/types";

const filters: { key: NoticeType; label: string; icon: typeof Bell }[] = [
  { key: "daily", label: "Daily", icon: Bell },
  { key: "weekly", label: "Weekly", icon: CalendarRange },
  { key: "monthly", label: "Monthly", icon: Megaphone },
];

export function NoticeBoard({ notices }: { notices: Notice[] }) {
  const [active, setActive] = useState<NoticeType>("daily");
  const visible = useMemo(() => notices.filter((notice) => notice.type === active), [active, notices]);

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <Container className="!px-0">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Notice Board" title="What's happening at the club" />
          <div className="flex w-full gap-1 rounded-full border border-brand/10 bg-white p-1 shadow-soft sm:w-auto">
            {filters.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                  active === key ? "bg-brand text-white shadow-soft" : "text-ink/70 hover:text-brand"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {visible.length === 0 && (
            <p className="rounded-3xl border border-dashed border-brand/20 bg-white p-8 text-center text-sm text-slatey md:col-span-3">
              No {active} notices right now. Check back soon!
            </p>
          )}
          {visible.map((notice) => (
            <article
              key={notice.id}
              className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-card"
            >
              <span className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
                {notice.type}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{notice.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slatey">{notice.content}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

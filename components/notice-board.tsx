"use client";

import { useMemo, useState } from "react";
import { Bell, CalendarRange, Megaphone } from "lucide-react";
import { Container } from "@/components/ui";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
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
    /* ── NOTICE BOARD — light alternating section ── */
    <section className="bg-white px-4 py-20 dark:bg-[#111c38] sm:px-6 lg:px-8">
      <Container className="!px-0">
        {/* Header row */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">Notice board</span>
            <h2 className="heading-lg mt-3 text-ink dark:text-white" style={{ fontSize: "clamp(1.6rem,3.5vw,2.5rem)" }}>
              What&apos;s happening{" "}
              <span className="mark-lime">at the club</span>
            </h2>
          </div>

          {/* Filter pills */}
          <div className="flex w-full gap-1 rounded-full border-2 border-ink/8 bg-ink/5 p-1 dark:border-white/10 dark:bg-white/5 sm:w-auto">
            {filters.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors sm:flex-none ${
                  active === key
                    ? "bg-ink text-white dark:bg-lime dark:text-ink"
                    : "text-ink/60 hover:text-ink dark:text-white/50 dark:hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Notices grid */}
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {visible.length === 0 && (
            <ScrollReveal direction="up">
              <p className="card-sport rounded-3xl border-dashed p-8 text-center text-sm text-slatey dark:text-white/50 md:col-span-3">
                No {active} notices right now. Check back soon!
              </p>
            </ScrollReveal>
          )}
          {visible.map((notice, idx) => (
            <ScrollReveal key={notice.id} delay={idx * 0.08} direction="up">
              <article className="card-sport h-full p-6 transition hover:-translate-y-1">
                <span className="tag-sport">{notice.type}</span>
                <h3 className="mt-4 font-display text-lg font-extrabold text-ink dark:text-white">
                  {notice.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slatey dark:text-white/60">
                  {notice.content}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

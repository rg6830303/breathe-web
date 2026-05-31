type Props = {
  countsByDate: Record<string, number>;
};

const WEEKS = 26;
const DAYS_PER_WEEK = 7;

function intensity(count: number): string {
  if (count <= 0) return "bg-brand/5";
  if (count === 1) return "bg-brand-200";
  if (count === 2) return "bg-brand-400";
  if (count === 3) return "bg-brand-600";
  return "bg-brand-800";
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

export function ActivityHeatmap({ countsByDate }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - WEEKS * DAYS_PER_WEEK + 1);
  // Align to Monday-week start
  const startDow = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - startDow);

  const cells: { date: Date; key: string; count: number }[] = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      const key = isoDate(cur);
      cells.push({ date: cur, key, count: countsByDate[key] ?? 0 });
    }
  }

  // Compute month labels at the top of each week column where the month changes
  const monthHeaders: { week: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const firstCell = cells[w * 7];
    const m = firstCell.date.getMonth();
    if (m !== lastMonth) {
      monthHeaders.push({ week: w, label: MONTH_LABELS[m] });
      lastMonth = m;
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid grid-flow-col" style={{ gridTemplateColumns: `28px repeat(${WEEKS}, 12px)` }}>
          <div />
          {Array.from({ length: WEEKS }).map((_, w) => {
            const header = monthHeaders.find((h) => h.week === w);
            return (
              <div key={`m-${w}`} className="text-[9px] font-bold uppercase tracking-wide text-slatey">
                {header?.label ?? ""}
              </div>
            );
          })}
        </div>
        <div className="mt-1 grid grid-flow-col gap-1" style={{ gridTemplateColumns: `28px repeat(${WEEKS}, 12px)` }}>
          <div className="grid grid-flow-row gap-1">
            {DAY_LABELS.map((d, i) => (
              <div key={`d-${i}`} className="text-[9px] font-semibold text-slatey leading-[12px] h-3">
                {d}
              </div>
            ))}
          </div>
          {Array.from({ length: WEEKS }).map((_, w) => (
            <div key={`w-${w}`} className="grid grid-flow-row gap-1">
              {Array.from({ length: DAYS_PER_WEEK }).map((_, d) => {
                const cell = cells[w * 7 + d];
                const future = cell.date > today;
                return (
                  <div
                    key={cell.key}
                    title={`${cell.date.toDateString()}: ${cell.count} session${cell.count === 1 ? "" : "s"}`}
                    className={`h-3 w-3 rounded-sm border border-white/40 ${
                      future ? "bg-transparent" : intensity(cell.count)
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wide text-slatey">
          <span>Less</span>
          <span className="h-2.5 w-2.5 rounded-sm bg-brand/5" />
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-200" />
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-400" />
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" />
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-800" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
